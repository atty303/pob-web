export interface WebSettings {
  performanceOverlay: boolean;
}

export const defaultWebSettings: WebSettings = {
  performanceOverlay: false,
};

const storageKey = "pob-web:settings";

export function loadWebSettings(storage: Pick<Storage, "getItem">): WebSettings {
  try {
    const value = JSON.parse(storage.getItem(storageKey) ?? "null") as unknown;
    if (!value || typeof value !== "object") return { ...defaultWebSettings };
    const settings = value as Record<string, unknown>;
    return {
      performanceOverlay: typeof settings.performanceOverlay === "boolean"
        ? settings.performanceOverlay
        : defaultWebSettings.performanceOverlay,
    };
  } catch {
    return { ...defaultWebSettings };
  }
}

export function saveWebSettings(storage: Pick<Storage, "setItem">, settings: WebSettings): boolean {
  try {
    storage.setItem(storageKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
