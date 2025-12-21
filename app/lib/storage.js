const KEY = "ai-helper-user";

export function loadUser() {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveUser(profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}

export function clearUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
