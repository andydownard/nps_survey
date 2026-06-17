import { useState } from 'react';
import { startAuth, checkAuth, AdminApiError } from '../adminApi';
import { BackButton } from './BackButton';

interface AdminSignInProps {
  onBack: () => void;
  onAuthed: (maskedPhone: string) => void;
}

/**
 * Phone → SMS code sign-in (Twilio Verify). Step 1 collects the number and
 * requests a code; step 2 verifies it. Non-admin numbers get an explicit
 * rejection from the server, surfaced inline.
 */
export function AdminSignIn({ onBack, onAuthed }: AdminSignInProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await startAuth(phone);
      setMaskedPhone(r.phone || phone);
      setStep('code');
    } catch (e2) {
      setErr(e2 instanceof AdminApiError ? e2.message : 'Could not send a code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await checkAuth(phone, code);
      onAuthed(r.phone || maskedPhone);
    } catch (e2) {
      setErr(e2 instanceof AdminApiError ? e2.message : 'Could not verify the code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <BackButton onClick={step === 'code' ? () => { setStep('phone'); setErr(''); } : onBack}>
          {step === 'code' ? 'Use a different number' : 'Back to survey'}
        </BackButton>
      </div>

      <h1 style={qStyle}>Admin sign in</h1>
      <p style={subStyle}>
        {step === 'phone'
          ? 'Enter your registered phone number and we’ll text you a sign-in code.'
          : `Enter the 6-digit code we sent to ${maskedPhone}.`}
      </p>

      {step === 'phone' ? (
        <form onSubmit={sendCode} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="admin-phone" style={labelStyle}>Phone number</label>
            <input
              id="admin-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (415) 555-1234"
              style={{ ...inputStyle, ...(err ? errInput : null) }}
            />
            {err && <div style={errText}>{err}</div>}
          </div>
          <div style={{ marginTop: 20 }}>
            <button type="submit" disabled={busy || phone.trim().length < 7} style={primaryBtn(busy || phone.trim().length < 7)}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="admin-code" style={labelStyle}>Verification code</label>
            <input
              id="admin-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              style={{ ...inputStyle, letterSpacing: '6px', fontSize: 20, textAlign: 'center', ...(err ? errInput : null) }}
            />
            {err && <div style={errText}>{err}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <button type="submit" disabled={busy || code.length < 4} style={primaryBtn(busy || code.length < 4)}>
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button type="button" onClick={() => sendCode()} disabled={busy} style={linkBtn}>Resend code</button>
          </div>
        </form>
      )}
    </div>
  );
}

const qStyle: React.CSSProperties = { fontSize: 23, lineHeight: 1.3, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-.2px' };
const subStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 14.5, margin: '0 0 24px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', font: 'inherit', fontSize: 15, border: '1.5px solid var(--line)', borderRadius: 11, padding: '12px 14px', color: 'var(--ink)', background: '#fff' };
const errInput: React.CSSProperties = { borderColor: 'var(--det)', background: '#FFFBFB' };
const errText: React.CSSProperties = { fontSize: 12.5, color: 'var(--det)', marginTop: 6, fontWeight: 600 };
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--subtle)', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 6, alignSelf: 'center' };
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    font: 'inherit', fontSize: 15, fontWeight: 600, borderRadius: 11, padding: '13px 20px',
    cursor: disabled ? 'default' : 'pointer', border: '1.5px solid transparent', width: '100%',
    background: disabled ? '#EAECED' : 'var(--brand)', color: disabled ? '#9ca3af' : '#fff',
  };
}
