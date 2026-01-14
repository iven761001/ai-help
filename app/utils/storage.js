const SAFE_STORAGE_KEY = "my_ai_character";

export const storage = {
  save: (data) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Save failed", e);
    }
  },
  load: () => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(SAFE_STORAGE_KEY));
    } catch (e) {
      return null;
    }
  },
  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SAFE_STORAGE_KEY);
  }
};
