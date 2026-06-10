import { describe, it, expect } from 'vitest';
import { cat, npsLabel, CAT_META, FACE } from './nps';

describe('cat()', () => {
  it('scores 0-6 are detractors', () => {
    for (let s = 0; s <= 6; s++) expect(cat(s)).toBe('det');
  });

  it('scores 7-8 are passives', () => {
    expect(cat(7)).toBe('pas');
    expect(cat(8)).toBe('pas');
  });

  it('scores 9-10 are promoters', () => {
    expect(cat(9)).toBe('pro');
    expect(cat(10)).toBe('pro');
  });

  it('boundary 6 is a detractor, 7 is a passive', () => {
    expect(cat(6)).toBe('det');
    expect(cat(7)).toBe('pas');
  });

  it('boundary 8 is a passive, 9 is a promoter', () => {
    expect(cat(8)).toBe('pas');
    expect(cat(9)).toBe('pro');
  });
});

describe('npsLabel()', () => {
  it('returns Excellent for NPS >= 70', () => {
    expect(npsLabel(70)).toBe('Excellent');
    expect(npsLabel(100)).toBe('Excellent');
  });

  it('returns Great for NPS 30-69', () => {
    expect(npsLabel(30)).toBe('Great');
    expect(npsLabel(50)).toBe('Great');
    expect(npsLabel(69)).toBe('Great');
  });

  it('returns Good for NPS 0-29', () => {
    expect(npsLabel(0)).toBe('Good');
    expect(npsLabel(15)).toBe('Good');
    expect(npsLabel(29)).toBe('Good');
  });

  it('returns Needs work for negative NPS', () => {
    expect(npsLabel(-1)).toBe('Needs work');
    expect(npsLabel(-50)).toBe('Needs work');
    expect(npsLabel(-100)).toBe('Needs work');
  });
});

describe('CAT_META', () => {
  it('has entries for all three categories', () => {
    expect(CAT_META).toHaveProperty('pro');
    expect(CAT_META).toHaveProperty('pas');
    expect(CAT_META).toHaveProperty('det');
  });

  it('each entry has label, range, color, bg', () => {
    for (const k of ['pro', 'pas', 'det'] as const) {
      expect(CAT_META[k]).toHaveProperty('label');
      expect(CAT_META[k]).toHaveProperty('range');
      expect(CAT_META[k]).toHaveProperty('color');
      expect(CAT_META[k]).toHaveProperty('bg');
    }
  });

  it('promoter label is Promoters', () => {
    expect(CAT_META.pro.label).toBe('Promoters');
  });

  it('detractor range mentions 0–6', () => {
    expect(CAT_META.det.range).toContain('0');
    expect(CAT_META.det.range).toContain('6');
  });
});

describe('FACE', () => {
  it('has SVG strings for all categories', () => {
    for (const k of ['pro', 'pas', 'det'] as const) {
      expect(FACE[k]).toContain('<svg');
      expect(FACE[k]).toContain('</svg>');
    }
  });

  it('all face SVGs contain a circle element', () => {
    for (const k of ['pro', 'pas', 'det'] as const) {
      expect(FACE[k]).toContain('circle');
    }
  });

  it('each category has a distinct face SVG', () => {
    expect(FACE.pro).not.toBe(FACE.pas);
    expect(FACE.pro).not.toBe(FACE.det);
    expect(FACE.pas).not.toBe(FACE.det);
  });
});

describe('npsLabel() boundary edges', () => {
  it('exactly 70 is Excellent', () => expect(npsLabel(70)).toBe('Excellent'));
  it('exactly 30 is Great',     () => expect(npsLabel(30)).toBe('Great'));
  it('exactly 0 is Good',       () => expect(npsLabel(0)).toBe('Good'));
  it('-1 is Needs work',        () => expect(npsLabel(-1)).toBe('Needs work'));
});

describe('CAT_META labels', () => {
  it('passive label is Passives',   () => expect(CAT_META.pas.label).toBe('Passives'));
  it('detractor label is Detractors', () => expect(CAT_META.det.label).toBe('Detractors'));
  it('promoter range mentions 9–10', () => {
    expect(CAT_META.pro.range).toContain('9');
    expect(CAT_META.pro.range).toContain('10');
  });
});
