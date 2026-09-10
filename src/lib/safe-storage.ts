let reported = false;

/**
 * Reported once a session, not once a call: writes run on every keystroke, so a store that
 * is denied or full would otherwise bury the console under the same failure.
 */
function report(operation: string, key: string, error: unknown): void {
  if (reported) return;
  reported = true;
  console.error(`localStorage ${operation} failed for "${key}"; values are not persisted:`, error);
}

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    report("read", key, error);
    return null;
  }
}

export function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    report("write", key, error);
    return false;
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    report("remove", key, error);
  }
}
