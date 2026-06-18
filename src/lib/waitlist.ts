export const waitlistEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidWaitlistEmail(email: string) {
  return waitlistEmailPattern.test(normalizeWaitlistEmail(email));
}
