export function loadUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ai-helper-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("ai-helper-user", JSON.stringify(profile));
  } catch {}
}

export function clearUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("ai-helper-user");
  } catch {}
}

export function loadFloatingPos() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("floating-techbear-pos");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFloatingPos(pos) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("floating-techbear-pos", JSON.stringify(pos));
  } catch {}
}
