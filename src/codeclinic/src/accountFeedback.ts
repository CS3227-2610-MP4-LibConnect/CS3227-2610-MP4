export type AccountField = 'name' | 'email' | 'currentPassword' | 'newPassword';
export type AccountFailure = { message: string; field?: AccountField; signIn?: boolean };

type FailureContext = 'profile' | 'password' | 'support';

const codeCopy: Record<string, string> = {
  AUTHENTICATION_REQUIRED: 'Your session has expired. Please sign in again.',
  CURRENT_PASSWORD_INCORRECT: 'Your current password is incorrect. Please try again.',
  CURRENT_PASSWORD_REQUIRED: 'Enter your current password to change your email address.',
  PASSWORD_ATTEMPTS_EXCEEDED: 'Too many password attempts. Please try again later.',
  INVALID_NAME: 'Enter a non-empty name within 200 UTF-8 bytes.',
  INVALID_EMAIL: 'Enter a valid email address within 254 UTF-8 bytes.',
  EMAIL_UNAVAILABLE: 'This email is unavailable. Use a different email address.',
  INVALID_NEW_PASSWORD: 'Use a password with at least 8 characters and no more than 1024 UTF-8 bytes.',
  INVALID_REQUEST: 'Check the information and try again.',
};
const fields = new Set<AccountField>(['name', 'email', 'currentPassword', 'newPassword']);

export async function readFailure(response: Response, context: FailureContext, temporaryPassword = false): Promise<AccountFailure> {
  const fallback = context === 'profile' ? 'Could not save your profile. Please try again.'
    : context === 'password' ? 'Could not change your password. Please try again.'
      : 'Could not complete this support action. Please try again.';
  if (context === 'support' && response.status === 401) return sessionFailure();
  // Support routes return no codes beyond 401, so explain the failure by status
  // with fixed local text; the server body is never shown.
  if (context === 'support' && response.status === 403) {
    return { message: "You don't have permission to change this account." };
  }
  if (context === 'support' && response.status === 404) {
    return { message: 'This account no longer exists. Refresh the page to update the list.' };
  }
  if (context === 'support' && response.status === 503) {
    return { message: 'The account service is temporarily unavailable. Please try again in a moment.' };
  }
  let body: unknown;
  try { body = await response.json(); } catch { return { message: fallback }; }
  if (!body || typeof body !== 'object') return { message: fallback };
  const data = body as { code?: unknown; field?: unknown };
  if (typeof data.code !== 'string' || !Object.prototype.hasOwnProperty.call(codeCopy, data.code)) {
    return { message: fallback };
  }
  const allowedCodes: Record<FailureContext, string[]> = {
    profile: ['AUTHENTICATION_REQUIRED', 'CURRENT_PASSWORD_INCORRECT', 'CURRENT_PASSWORD_REQUIRED', 'INVALID_NAME', 'INVALID_EMAIL', 'EMAIL_UNAVAILABLE', 'INVALID_REQUEST'],
    password: ['AUTHENTICATION_REQUIRED', 'CURRENT_PASSWORD_INCORRECT', 'PASSWORD_ATTEMPTS_EXCEEDED', 'INVALID_NEW_PASSWORD', 'INVALID_REQUEST'],
    support: ['AUTHENTICATION_REQUIRED'],
  };
  if (!allowedCodes[context].includes(data.code)) return { message: fallback };
  const expectedStatus: Record<string, number> = {
    AUTHENTICATION_REQUIRED: 401, CURRENT_PASSWORD_INCORRECT: 401, PASSWORD_ATTEMPTS_EXCEEDED: 401,
    CURRENT_PASSWORD_REQUIRED: 400, INVALID_NAME: 400, INVALID_EMAIL: 400, INVALID_NEW_PASSWORD: 400,
    EMAIL_UNAVAILABLE: 409, INVALID_REQUEST: 400,
  };
  if (response.status !== expectedStatus[data.code]) return { message: fallback };
  let field = fields.has(data.field as AccountField) ? data.field as AccountField : undefined;
  // A server code is authoritative for the field it can safely identify.
  if (data.code === 'CURRENT_PASSWORD_INCORRECT' || data.code === 'CURRENT_PASSWORD_REQUIRED') field = 'currentPassword';
  if (data.code === 'INVALID_NAME') field = 'name';
  if (data.code === 'INVALID_EMAIL' || data.code === 'EMAIL_UNAVAILABLE') field = 'email';
  if (data.code === 'INVALID_NEW_PASSWORD') field = 'newPassword';
  if (data.code === 'AUTHENTICATION_REQUIRED' || data.code === 'PASSWORD_ATTEMPTS_EXCEEDED' || data.code === 'INVALID_REQUEST') field = undefined;
  let message = codeCopy[data.code];
  if (temporaryPassword && data.code === 'CURRENT_PASSWORD_INCORRECT') {
    message = 'Your temporary password is incorrect. Please try again.';
  }
  return { message, field, signIn: data.code === 'AUTHENTICATION_REQUIRED' };
}

export function csrfFailure(context: FailureContext): AccountFailure {
  return { message: context === 'profile' ? 'Could not verify your profile update. Please try again.'
    : context === 'password' ? 'Could not verify your password change. Please try again.'
      : 'Could not verify this support action. Please try again.' };
}
export function sessionFailure(): AccountFailure {
  return { message: codeCopy.AUTHENTICATION_REQUIRED, signIn: true };
}
