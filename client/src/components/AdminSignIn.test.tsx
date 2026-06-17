import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../adminApi', () => {
  class AdminApiError extends Error {
    code: string;
    constructor(code: string, message: string) { super(message); this.code = code; }
  }
  return { startAuth: vi.fn(), checkAuth: vi.fn(), AdminApiError };
});

import { AdminSignIn } from './AdminSignIn';
import { startAuth, checkAuth, AdminApiError } from '../adminApi';

describe('AdminSignIn', () => {
  beforeEach(() => { vi.mocked(startAuth).mockReset(); vi.mocked(checkAuth).mockReset(); });

  it('sends a code then verifies, calling onAuthed', async () => {
    vi.mocked(startAuth).mockResolvedValue({ phone: '+1•••1234' });
    vi.mocked(checkAuth).mockResolvedValue({ phone: '+1•••1234' });
    const onAuthed = vi.fn();
    render(<AdminSignIn onBack={() => {}} onAuthed={onAuthed} />);

    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '415-555-1234' } });
    fireEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(startAuth).toHaveBeenCalledWith('415-555-1234'));
    const codeInput = await screen.findByLabelText('Verification code');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & sign in'));

    await waitFor(() => expect(onAuthed).toHaveBeenCalledWith('+1•••1234'));
  });

  it('shows the server message when the number is not an admin', async () => {
    vi.mocked(startAuth).mockRejectedValue(new AdminApiError('not_admin', "That number isn't registered for admin access."));
    render(<AdminSignIn onBack={() => {}} onAuthed={() => {}} />);

    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+19998887777' } });
    fireEvent.click(screen.getByText('Send code'));

    expect(await screen.findByText(/registered for admin access/i)).toBeInTheDocument();
    expect(screen.getByText('Send code')).toBeInTheDocument();
  });
});
