declare const DOMKeySymbol: unique symbol;
import { resolveClipboardShortcut } from "./clipboard.ts";
/// A string that represents a key from the DOM KeyboardEvent.key property
export type DOMKey = string & { [DOMKeySymbol]: never };

/// A string that represents a key in Path of Building
declare const PoBKeySymbol: unique symbol;
export type PoBKey = string & { [PoBKeySymbol]: never };

export type KeyboardStateCallbacks = {
  onKeyDown: (state: PoBKeyboardState, key: PoBKey, doubleClick: number) => void;
  onKeyUp: (state: PoBKeyboardState, key: PoBKey) => void;
  onChar: (state: PoBKeyboardState, char: string) => void;
};

// Provides a view of the keyboard state in terms of PoB keys (including mouse buttons)
export type PoBKeyboardState = {
  pobKeys: Set<PoBKey>;

  keydown: (pobKey: PoBKey, doubleClick: number) => void;
  keyup: (pobKey: PoBKey) => void;
  keypress: (char: string) => void;
};
export const PoBKeyboardState = {
  make(callbacks: KeyboardStateCallbacks): PoBKeyboardState {
    const keys = new Set<PoBKey>();

    return {
      pobKeys: keys,

      keydown(pobKey: PoBKey, doubleclick: number): void {
        if (doubleclick < 1) {
          keys.add(pobKey);
        }
        callbacks?.onKeyDown(this, pobKey, doubleclick);
      },

      keyup(pobKey: PoBKey): void {
        keys.delete(pobKey);
        callbacks?.onKeyUp(this, pobKey);
      },

      keypress(char: string): void {
        callbacks?.onChar(this, char);
      },
    };
  },
};

// Manages the state of the physical and virtual keyboard
export type DOMKeyboardState = {
  keydown: (domKey: DOMKey) => void;
  keyup: (domKey: DOMKey) => void;
  keypress: (char: string) => void;
  releasePhysicalKeys: () => void;

  virtualKeyPress: (domKey: DOMKey, isModifier: boolean) => Set<DOMKey>;
};
export const DOMKeyboardState = {
  make(pobKeyboardState: PoBKeyboardState): DOMKeyboardState {
    const physicalKeys = new Set<PoBKey>();
    const virtualHeldKeys = new Set<DOMKey>();
    const isVirtuallyHeld = (pobKey: PoBKey) =>
      [...virtualHeldKeys].some((domKey) => domKeyToPobKey(domKey) === pobKey);

    return {
      keydown(domKey: DOMKey) {
        const pobKey = domKeyToPobKey(domKey);
        physicalKeys.add(pobKey);
        pobKeyboardState.keydown(pobKey, 0);

        const char = EXTRA_CHAR_MAP.get(domKey);
        if (char) {
          pobKeyboardState?.keypress(char);
        }
      },

      keyup(domKey: DOMKey): void {
        const pobKey = domKeyToPobKey(domKey);
        const wasPhysical = physicalKeys.delete(pobKey);
        if (wasPhysical && !isVirtuallyHeld(pobKey)) {
          pobKeyboardState.keyup(pobKey);
        }
      },

      keypress(char: string): void {
        pobKeyboardState.keypress(char);
      },

      releasePhysicalKeys(): void {
        for (const pobKey of physicalKeys) {
          if (!isVirtuallyHeld(pobKey)) {
            pobKeyboardState.keyup(pobKey);
          }
        }
        physicalKeys.clear();
      },

      virtualKeyPress(domKey: DOMKey, isModifier: boolean): Set<DOMKey> {
        const pobKey = domKeyToPobKey(domKey);
        if (isModifier) {
          if (virtualHeldKeys.has(domKey)) {
            virtualHeldKeys.delete(domKey);
            if (!physicalKeys.has(pobKey)) {
              pobKeyboardState.keyup(pobKey);
            }
          } else {
            virtualHeldKeys.add(domKey);
            if (!physicalKeys.has(pobKey)) {
              pobKeyboardState.keydown(pobKey, 0);
            }
          }
        } else {
          pobKeyboardState.keydown(pobKey, 0);
          if (
            domKey.length === 1 &&
            !virtualHeldKeys.has("Control" as DOMKey) &&
            !virtualHeldKeys.has("Alt" as DOMKey)
          ) {
            const char = virtualHeldKeys.has("Shift" as DOMKey) ? applyShiftTransformation(domKey) : domKey;
            pobKeyboardState.keypress(char);
          }
          if (!physicalKeys.has(pobKey) && !isVirtuallyHeld(pobKey)) {
            pobKeyboardState.keyup(pobKey);
          }
        }
        return virtualHeldKeys;
      },
    };
  },
};

const DOM_TO_POB_KEY_MAP: Map<DOMKey, PoBKey> = new Map([
  ["Backspace", "BACK"],
  ["Tab", "TAB"],
  ["Enter", "RETURN"],
  ["Escape", "ESCAPE"],
  ["Space", " "],
  ["Control", "CTRL"],
  ["Shift", "SHIFT"],
  ["Alt", "ALT"],
  ["Pause", "PAUSE"],
  ["PageUp", "PAGEUP"],
  ["PageDown", "PAGEDOWN"],
  ["End", "END"],
  ["Home", "HOME"],
  ["PrintScreen", "PRINTSCREEN"],
  ["Insert", "INSERT"],
  ["Delete", "DELETE"],
  ["ArrowUp", "UP"],
  ["ArrowDown", "DOWN"],
  ["ArrowLeft", "LEFT"],
  ["ArrowRight", "RIGHT"],
  ["F1", "F1"],
  ["F2", "F2"],
  ["F3", "F3"],
  ["F4", "F4"],
  ["F5", "F5"],
  ["F6", "F6"],
  ["F7", "F7"],
  ["F8", "F8"],
  ["F9", "F9"],
  ["F10", "F10"],
  ["F11", "F11"],
  ["F12", "F12"],
  ["F13", "F13"],
  ["F14", "F14"],
  ["F15", "F15"],
  ["NumLock", "NUMLOCK"],
  ["ScrollLock", "SCROLLLOCK"],
  ["LEFTBUTTON", "LEFTBUTTON"],
  ["MIDDLEBUTTON", "MIDDLEBUTTON"],
  ["RIGHTBUTTON", "RIGHTBUTTON"],
  ["MOUSE4", "MOUSE4"],
  ["MOUSE5", "MOUSE5"],
  ["WHEELUP", "WHEELUP"],
  ["WHEELDOWN", "WHEELDOWN"],
] as [DOMKey, PoBKey][]);

const EXTRA_CHAR_MAP: Map<DOMKey, string> = new Map([
  ["Backspace", "\b"],
  ["Tab", "\t"],
  ["Enter", "\r"],
  ["Escape", "\u001B"],
] as [DOMKey, string][]);

function domKeyToPobKey(domKey: DOMKey): PoBKey {
  if (DOM_TO_POB_KEY_MAP.has(domKey)) {
    return DOM_TO_POB_KEY_MAP.get(domKey)!;
  } else if (domKey.length === 1) {
    return domKey.toLowerCase() as PoBKey;
  } else {
    return domKey as string as PoBKey;
  }
}

const SHIFT_MAP: Map<string, string> = new Map([
  ["1", "!"],
  ["2", "@"],
  ["3", "#"],
  ["4", "$"],
  ["5", "%"],
  ["6", "^"],
  ["7", "&"],
  ["8", "*"],
  ["9", "("],
  ["0", ")"],
  ["`", "~"],
  ["-", "_"],
  ["=", "+"],
  ["[", "{"],
  ["]", "}"],
  ["\\", "|"],
  [";", ":"],
  ["'", '"'],
  [",", "<"],
  [".", ">"],
  ["/", "?"],
]);

function applyShiftTransformation(domKey: DOMKey): string {
  if (/^[a-z]$/.test(domKey)) {
    return domKey.toUpperCase();
  }
  const char = SHIFT_MAP.get(domKey);
  if (char) {
    return char;
  } else {
    return domKey;
  }
}

// Manages the state of the keyboard, including currently pressed keys and held modifier keys
// Handles DOM keyboard events and forwards them to the KeyboardState
export type KeyboardHandler = {
  destroy(): void;
};

export const KeyboardHandler = {
  make(
    el: HTMLElement,
    keyboardState: DOMKeyboardState,
    onClipboardShortcut: (shortcut: "copy") => void,
  ): KeyboardHandler {
    const ac = new AbortController();
    const signal = ac.signal;

    el.addEventListener(
      "keydown",
      (e) => {
        const key: unknown = e.key;
        if (typeof key !== "string" || key.length === 0) {
          e.preventDefault();
          return;
        }

        const domKey = key as DOMKey;
        const clipboardShortcut = resolveClipboardShortcut(key, e.ctrlKey || e.metaKey);
        if (clipboardShortcut) {
          if (clipboardShortcut === "copy") {
            e.preventDefault();
            onClipboardShortcut(clipboardShortcut);
          }
          return;
        }
        e.preventDefault();
        keyboardState.keydown(domKey);
        if (key.length === 1 && !e.metaKey && (!e.ctrlKey || e.getModifierState("AltGraph"))) {
          keyboardState.keypress(key);
        }
      },
      { signal },
    );

    el.addEventListener(
      "keyup",
      (e) => {
        e.preventDefault();
        const key: unknown = e.key;
        if (typeof key !== "string" || key.length === 0) {
          keyboardState.releasePhysicalKeys();
          return;
        }
        keyboardState.keyup(key as DOMKey);
      },
      { signal },
    );

    return {
      destroy() {
        ac.abort();
      },
    };
  },
};
