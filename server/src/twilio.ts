// Thin wrapper around Twilio Verify (SMS OTP). Kept separate from the routes so
// it can be mocked in tests. Reads config from the environment:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
import twilio, { Twilio } from 'twilio';

let _client: Twilio | null = null;
function client(): Twilio {
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

// The Verify Service SID. Accepts either TWILIO_VERIFY_SERVICE_SID (Twilio's
// own term) or TWILIO_VERIFY_SERVICE_ID, so existing deploys keep working.
function verifyServiceSid(): string | undefined {
  return process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_VERIFY_SERVICE_ID;
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
  await client().verify.v2.services(verifyServiceSid()!).verifications.create({ to: phone, channel: 'sms' });
}

/** Check a code against Twilio Verify. Returns true only when approved. */
export async function checkVerification(phone: string, code: string): Promise<boolean> {
  const result = await client()
    .verify.v2.services(verifyServiceSid()!)
    .verificationChecks.create({ to: phone, code });
  return result.status === 'approved';
}
