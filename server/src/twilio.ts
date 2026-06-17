// Thin wrapper around Twilio Verify (SMS OTP). Kept separate from the routes so
// it can be mocked in tests. Talks to the Twilio Verify REST API directly with
// the built-in global `fetch` (no SDK). Reads config from the environment:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID

const VERIFY_BASE = 'https://verify.twilio.com/v2/Services';
const TIMEOUT_MS = 10_000;

// The Verify Service SID. Accepts either TWILIO_VERIFY_SERVICE_SID (Twilio's
// own term) or TWILIO_VERIFY_SERVICE_ID, so existing deploys keep working.
function verifyServiceSid(): string | undefined {
  return process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_VERIFY_SERVICE_ID;
}

// HTTP Basic auth header from the account SID and auth token.
function authHeader(): string {
  const creds = `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
}

// POST a form-urlencoded body to a Verify endpoint, with a 10s timeout. Throws
// on a non-2xx response, surfacing Twilio's `message` field when present.
async function postVerify(
  path: string,
  body: URLSearchParams,
): Promise<{ status?: string; message?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${VERIFY_BASE}/${verifyServiceSid()}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      let message: string | undefined;
      try {
        message = (JSON.parse(text) as { message?: string }).message;
      } catch {
        // body was not JSON; fall through to the generic message
      }
      throw new Error(
        `Twilio Verify request failed (${res.status})${message ? `: ${message}` : ''}`,
      );
    }
    return JSON.parse(text) as { status?: string; message?: string };
  } finally {
    clearTimeout(timer);
  }
}

/** True when all three Twilio env vars are present. */
export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      verifyServiceSid(),
  );
}

/** Send an SMS verification code to `phone` (E.164). */
export async function sendVerification(phone: string): Promise<void> {
  const body = new URLSearchParams({ To: phone, Channel: 'sms' });
  await postVerify('Verifications', body);
}

/** Check a code against Twilio Verify. Returns true only when approved. */
export async function checkVerification(phone: string, code: string): Promise<boolean> {
  const body = new URLSearchParams({ To: phone, Code: code });
  const json = await postVerify('VerificationCheck', body);
  return json.status === 'approved';
}
