// Daily NPS digest: compute yesterday's numbers, render an email-safe HTML
// report (modeled on the "Daily NPS Report Email" design), and send via
// Postmark. Pure compute/render functions are exported for unit testing;
// sendDigest() is the only piece that touches the network.

import type Database from 'better-sqlite3';
import { ServerClient, Message } from 'postmark';
import { cat, countScores, npsFromCounts, type Counts } from './nps.js';

// ── palette (resolved from the design's CSS variables) ──────────────────────
const C = {
  brand: '#35644F',
  ink: '#1f2937',
  body: '#374151',
  muted: '#6b7280',
  subtle: '#9ca3af',
  surface: '#ffffff',
  canvas: '#e9ecef',
  lineSoft: '#f0f1f3',
  footer: '#f3f4f6',
  det: '#DC2626', detBg: '#FEE2E2', detTint: '#FEF2F2',
  pas: '#D97706', pasBg: '#FEF3C7', pasTint: '#FFFBEB',
  pro: '#059669', proBg: '#D1FAE5', proTint: '#ECFDF5',
} as const;

const CAT_COLOR: Record<'pro' | 'pas' | 'det', { fg: string; bg: string; tint: string; label: string }> = {
  pro: { fg: C.pro, bg: C.proBg, tint: C.proTint, label: 'Promoter' },
  pas: { fg: C.pas, bg: C.pasBg, tint: C.pasTint, label: 'Passive' },
  det: { fg: C.det, bg: C.detBg, tint: C.detTint, label: 'Detractor' },
};

// ── types ───────────────────────────────────────────────────────────────────
interface Row { id: number; score: number; comment: string; created_at: string }

export interface Quote { score: number; comment: string; when: string; category: 'pro' | 'pas' | 'det' }

export interface DigestData {
  /** 'daily' = the prior UTC day; 'all' = every response to date. */
  scope: 'daily' | 'all';
  /** The day the report covers, formatted "Mon, Jun 16". */
  dateLabel: string;
  /** "Monday, June 16" for the hero. */
  dateLong: string;
  total: number;
  nps: number;
  counts: Counts;
  /** Percent of total per bucket, rounded; zeroed when total is 0. */
  pct: { pro: number; pas: number; det: number };
  /** Average daily NPS over the 7 days before the report day; null if no history. */
  avg7: number | null;
  /** nps − avg7, null when avg7 is null. */
  trend: number | null;
  detractors: Quote[];
  topPromoter: Quote | null;
}

// ── date helpers (UTC day boundaries) ────────────────────────────────────────
function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function isoBounds(dayStartMs: number): { start: string; end: string } {
  return {
    start: new Date(dayStartMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    end: new Date(dayStartMs + 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}
function timeOfDay(iso: string): string {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap} UTC`;
}

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function rowsForDay(db: Database.Database, dayStartMs: number): Row[] {
  const { start, end } = isoBounds(dayStartMs);
  return db
    .prepare('SELECT id, score, comment, created_at FROM responses WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC')
    .all(start, end) as Row[];
}

// ── compute ───────────────────────────────────────────────────────────────
/**
 * Build the digest for the calendar day before `now` (UTC). The 7-day average
 * is the mean of daily NPS over the seven days preceding the report day,
 * counting only days that actually had responses.
 */
export function computeDigest(
  db: Database.Database,
  now: Date = new Date(),
  opts: { allTime?: boolean } = {},
): DigestData {
  const allTime = opts.allTime === true;
  const dayStart = utcDayStart(now) - 86_400_000; // yesterday
  const day = new Date(dayStart);

  // 'all' scope ignores the date window and has no daily trend baseline.
  const rows = allTime
    ? (db.prepare('SELECT id, score, comment, created_at FROM responses ORDER BY created_at DESC').all() as { id: number; score: number; comment: string; created_at: string }[])
    : rowsForDay(db, dayStart);
  const total = rows.length;
  const counts = countScores(rows.map(r => r.score));
  const nps = npsFromCounts(counts);
  const pct = total === 0
    ? { pro: 0, pas: 0, det: 0 }
    : {
        pro: Math.round((counts.pro / total) * 100),
        pas: Math.round((counts.pas / total) * 100),
        det: Math.round((counts.det / total) * 100),
      };

  // 7-day baseline: average of daily NPS for the 7 days before the report day.
  // Skipped for all-time reports (no single reference day to trend against).
  let avg7: number | null = null;
  if (!allTime) {
    const dailyNps: number[] = [];
    for (let i = 1; i <= 7; i++) {
      const r = rowsForDay(db, dayStart - i * 86_400_000);
      if (r.length === 0) continue;
      dailyNps.push(npsFromCounts(countScores(r.map(x => x.score))));
    }
    if (dailyNps.length > 0) avg7 = Math.round(dailyNps.reduce((a, b) => a + b, 0) / dailyNps.length);
  }
  const trend = avg7 === null ? null : nps - avg7;

  const withComment = rows.filter(r => r.comment.trim() !== '');
  const detractors: Quote[] = withComment
    .filter(r => cat(r.score) === 'det')
    .slice(0, 3)
    .map(r => ({ score: r.score, comment: r.comment, when: timeOfDay(r.created_at), category: 'det' as const }));

  // Top promoter quote: highest-scoring promoter with a comment, most recent on ties.
  const promoters = withComment
    .filter(r => cat(r.score) === 'pro')
    .sort((a, b) => b.score - a.score); // rows already sorted by created_at desc
  const tp = promoters[0];
  const topPromoter: Quote | null = tp
    ? { score: tp.score, comment: tp.comment, when: timeOfDay(tp.created_at), category: 'pro' }
    : null;

  return {
    scope: allTime ? 'all' : 'daily',
    dateLabel: allTime ? 'All time' : `${DOW[day.getUTCDay()].slice(0, 3)}, ${MON[day.getUTCMonth()]} ${day.getUTCDate()}`,
    dateLong: allTime ? 'all time' : `${DOW[day.getUTCDay()]}, ${MON_LONG[day.getUTCMonth()]} ${day.getUTCDate()}`,
    total, nps, counts, pct, avg7, trend, detractors, topPromoter,
  };
}

// ── render ──────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function commentCard(q: Quote): string {
  const c = CAT_COLOR[q.category];
  return `
    <tr><td style="padding:0 0 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.tint};border-left:3px solid ${c.fg};border-radius:4px 10px 10px 4px;">
        <tr><td style="padding:11px 13px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font:700 12.5px sans-serif;color:${c.fg};">
              <span style="background:${c.bg};border-radius:40px;padding:2px 8px;">${q.score}/10</span>
              <span style="font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;padding-left:8px;">${esc(c.label)}</span>
            </td>
            <td align="right" style="font:600 11.5px sans-serif;color:${C.subtle};white-space:nowrap;">${esc(q.when)}</td>
          </tr></table>
          <p style="margin:6px 0 0;font:400 14px/1.5 sans-serif;color:${C.body};">${esc(q.comment)}</p>
        </td></tr>
      </table>
    </td></tr>`;
}

function sectionHeader(label: string, color: string): string {
  return `<h3 style="margin:0 0 12px;font:700 11.5px sans-serif;color:${color};text-transform:uppercase;letter-spacing:1.2px;">${esc(label)}</h3>`;
}

/** Render the digest to a Postmark-ready subject + HTML + text body. */
export function renderDigest(d: DigestData, opts: { dashboardUrl?: string; cohort?: string } = {}): { subject: string; html: string; text: string } {
  const dashboardUrl = opts.dashboardUrl || '#';
  const cohort = opts.cohort || 'your cohort';
  const allTime = d.scope === 'all';
  const subject = allTime ? 'NPS report — all time' : `Daily NPS report — ${d.dateLabel}`;
  const heroLabel = allTime ? 'All time' : `Yesterday · ${d.dateLong}`;

  // The pill resets letter-spacing/line-height (the headline number sets
  // letter-spacing:-2px, which otherwise collapses the pill's spaces) and
  // bottom-aligns against the big number with a left gap and a little lift.
  const trendCell = d.trend !== null
    ? `<td valign="bottom" style="padding:0 0 12px 14px;">
         <span style="display:inline-block;background:rgba(255,255,255,.18);padding:6px 11px;border-radius:40px;font:700 12.5px/1 sans-serif;letter-spacing:0;color:#ffffff;white-space:nowrap;">${signed(d.trend)} vs 7-day avg</span>
       </td>`
    : '';

  // Hero differs for an empty day so the email still reads well.
  const heroBody = d.total === 0
    ? `<div style="font:700 30px/1.1 sans-serif;color:#ffffff;letter-spacing:-1px;">No responses ${allTime ? 'yet' : 'yesterday'}</div>
       <p style="margin:14px 0 0;font:400 13.5px/1.45 sans-serif;color:#ffffff;opacity:.85;">Nothing came in ${allTime ? 'so far' : `for ${esc(d.dateLong)}`}. We'll keep watching.</p>`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
         <td valign="bottom" style="font:700 64px/1 sans-serif;color:#ffffff;letter-spacing:-2px;">${signed(d.nps)}</td>
         ${trendCell}
       </tr></table>
       <p style="margin:14px 0 0;font:400 13.5px/1.45 sans-serif;color:#ffffff;opacity:.85;">
         <b style="font-weight:600;">${d.total} response${d.total === 1 ? '' : 's'}</b> · ${d.counts.pro} promoter${d.counts.pro === 1 ? '' : 's'}, ${d.counts.pas} passive${d.counts.pas === 1 ? '' : 's'}, ${d.counts.det} detractor${d.counts.det === 1 ? '' : 's'}.
       </p>`;

  // Breakdown (stacked bar + legend), only when there's data.
  const stackCell = (w: number, color: string) =>
    w > 0 ? `<td bgcolor="${color}" style="width:${w}%;font-size:0;line-height:0;">&nbsp;</td>` : '';
  const legendRow = (label: string, color: string, n: number, p: number) => `
    <tr>
      <td style="padding:8px 0;font:600 14px sans-serif;color:${C.ink};">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:10px;"></span>${esc(label)}
      </td>
      <td align="right" style="padding:8px 0;font:600 14px sans-serif;color:${C.muted};"><b style="color:${C.ink};">${n}</b> / ${d.total}</td>
      <td align="right" style="padding:8px 0 8px 14px;font:700 14px sans-serif;color:${color};">${p}%</td>
    </tr>`;

  const breakdown = d.total === 0 ? '' : `
    <tr><td style="background:${C.surface};padding:22px 22px 16px;">
      ${sectionHeader('Breakdown', C.subtle)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:40px;overflow:hidden;background:${C.lineSoft};margin-bottom:8px;">
        <tr style="height:12px;">${stackCell(d.pct.pro, C.pro)}${stackCell(d.pct.pas, C.pas)}${stackCell(d.pct.det, C.det)}</tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${legendRow('Promoters', C.pro, d.counts.pro, d.pct.pro)}
        ${legendRow('Passives', C.pas, d.counts.pas, d.pct.pas)}
        ${legendRow('Detractors', C.det, d.counts.det, d.pct.det)}
      </table>
    </td></tr>`;

  const detractorsBlock = d.detractors.length === 0 ? '' : `
    <tr><td style="background:${C.surface};padding:6px 22px 16px;">
      ${sectionHeader(`Needs attention · ${d.detractors.length} detractor${d.detractors.length === 1 ? '' : 's'}`, C.det)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${d.detractors.map(commentCard).join('')}</table>
    </td></tr>`;

  const promoterBlock = !d.topPromoter ? '' : `
    <tr><td style="background:${C.surface};padding:6px 22px 22px;">
      ${sectionHeader('Top promoter quote', C.pro)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${commentCard(d.topPromoter)}</table>
    </td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};">
    <tr><td align="center" style="padding:24px 12px 60px;">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:${C.surface};border-radius:18px;overflow:hidden;">

        <!-- hero -->
        <tr><td style="background:${C.brand};padding:26px 22px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font:600 13px sans-serif;color:#ffffff;letter-spacing:.2px;">Vibe Coding Bootcamp</td>
            <td align="right" style="font:700 11px sans-serif;color:#ffffff;opacity:.7;letter-spacing:1.4px;text-transform:uppercase;">${allTime ? 'Report' : 'Daily report'}</td>
          </tr></table>
          <p style="margin:18px 0 10px;font:600 14px sans-serif;color:#ffffff;opacity:.95;">${esc(heroLabel)}</p>
          ${heroBody}
        </td></tr>

        ${breakdown}
        ${detractorsBlock}
        ${promoterBlock}

        <!-- CTA -->
        <tr><td align="center" style="background:${C.surface};padding:22px;">
          <a href="${esc(dashboardUrl)}" style="display:inline-block;background:${C.brand};color:#ffffff;font:600 15px sans-serif;padding:14px 22px;border-radius:11px;text-decoration:none;">View full dashboard</a>
          <p style="margin:12px 0 0;font:400 12.5px sans-serif;color:${C.muted};">See all responses, comments, and the 30-day trend on the <a href="${esc(dashboardUrl)}" style="color:${C.brand};text-decoration:none;font-weight:600;">cohort dashboard</a>.</p>
        </td></tr>

        <!-- footer -->
        <tr><td style="background:${C.footer};padding:20px 22px 26px;text-align:center;font:400 11.5px/1.6 sans-serif;color:${C.subtle};">
          You're receiving this because daily reports are on for <b style="color:${C.muted};">${esc(cohort)}</b>.<br>
          Vibe Coding Bootcamp
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = renderText(d, dashboardUrl);
  return { subject, html, text };
}

function renderText(d: DigestData, dashboardUrl: string): string {
  const lines: string[] = [];
  lines.push(d.scope === 'all' ? 'NPS REPORT — ALL TIME' : `DAILY NPS REPORT — ${d.dateLong}`, '');
  if (d.total === 0) {
    lines.push(d.scope === 'all' ? 'No responses yet.' : 'No responses yesterday.');
  } else {
    const trend = d.trend !== null ? `  (${signed(d.trend)} vs 7-day avg)` : '';
    lines.push(`NPS: ${signed(d.nps)}${trend}`);
    lines.push(`${d.total} responses · ${d.counts.pro} promoters, ${d.counts.pas} passives, ${d.counts.det} detractors`, '');
    lines.push(`Promoters  ${d.counts.pro}/${d.total} (${d.pct.pro}%)`);
    lines.push(`Passives   ${d.counts.pas}/${d.total} (${d.pct.pas}%)`);
    lines.push(`Detractors ${d.counts.det}/${d.total} (${d.pct.det}%)`, '');
    if (d.detractors.length) {
      lines.push(`NEEDS ATTENTION · ${d.detractors.length} detractor${d.detractors.length === 1 ? '' : 's'}`);
      for (const q of d.detractors) lines.push(`  [${q.score}/10 · ${q.when}] ${q.comment}`);
      lines.push('');
    }
    if (d.topPromoter) {
      lines.push('TOP PROMOTER QUOTE');
      lines.push(`  [${d.topPromoter.score}/10 · ${d.topPromoter.when}] ${d.topPromoter.comment}`, '');
    }
  }
  lines.push(`View full dashboard: ${dashboardUrl}`);
  return lines.join('\n');
}

// ── send ────────────────────────────────────────────────────────────────────
export interface SendResult { skipped: boolean; reason?: string; messageIds?: string[] }

/**
 * Send the rendered digest via Postmark. No-ops (skipped:true) when any required
 * config (POSTMARK_SERVER_TOKEN, DIGEST_FROM, DIGEST_TO) is unset, so dev and tests never email.
 * Config is read from the environment:
 *   POSTMARK_SERVER_TOKEN, DIGEST_FROM, DIGEST_TO (comma-separated),
 *   POSTMARK_MESSAGE_STREAM (default "broadcast"), DASHBOARD_URL, DIGEST_COHORT.
 *
 * opts.allTime → report over every response instead of just yesterday.
 * opts.to      → override DIGEST_TO recipients (e.g. a one-off sample send).
 */
export async function sendDigest(
  db: Database.Database,
  now: Date = new Date(),
  opts: { allTime?: boolean; to?: string[] } = {},
): Promise<SendResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.DIGEST_FROM;
  const to = (opts.to && opts.to.length > 0
    ? opts.to
    : (process.env.DIGEST_TO || '').split(',').map(s => s.trim()).filter(Boolean));

  if (!token) return { skipped: true, reason: 'POSTMARK_SERVER_TOKEN is not set' };
  if (!from) return { skipped: true, reason: 'DIGEST_FROM is not set' };
  if (to.length === 0) return { skipped: true, reason: 'no recipients (DIGEST_TO unset and no override)' };

  const data = computeDigest(db, now, { allTime: opts.allTime });
  const { subject, html, text } = renderDigest(data, {
    dashboardUrl: process.env.DASHBOARD_URL,
    cohort: process.env.DIGEST_COHORT,
  });

  const client = new ServerClient(token);
  const stream = process.env.POSTMARK_MESSAGE_STREAM || 'broadcast';

  // One message per recipient so addresses aren't disclosed to each other.
  const messages: Message[] = to.map(addr => ({
    From: from,
    To: addr,
    Subject: subject,
    HtmlBody: html,
    TextBody: text,
    MessageStream: stream,
  }));

  const results = await client.sendEmailBatch(messages);
  const messageIds = results.map(r => r.MessageID).filter(Boolean) as string[];
  const failed = results.filter(r => r.ErrorCode !== 0);
  if (failed.length) {
    throw new Error(`Postmark rejected ${failed.length}/${results.length}: ${failed.map(f => f.Message).join('; ')}`);
  }
  return { skipped: false, messageIds };
}
