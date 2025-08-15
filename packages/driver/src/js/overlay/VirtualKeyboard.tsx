import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardState } from "../keyboard";
import { KeyButton } from "./KeyButton";
import type { ModifierKeys, ToolbarCallbacks, UIState } from "./types";

interface VirtualKeyboardProps {
  isVisible: boolean;
  callbacks: ToolbarCallbacks;
  keyboardState: KeyboardState;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isVisible, callbacks, keyboardState }) => {
  // Use state to track keyboard state changes for React reactivity
  const [heldKeys, setHeldKeys] = useState(keyboardState.heldKeys);
  const [symbolMode, setSymbolMode] = useState(false);

  // Update local state when keyboard state changes
  const updateLocalState = useCallback(() => {
    setHeldKeys(new Set(keyboardState.heldKeys));
  }, [keyboardState]);

  // Listen for keyboard state changes
  useEffect(() => {
    keyboardState.addChangeListener(updateLocalState);
    return () => {
      keyboardState.removeChangeListener(updateLocalState);
    };
  }, [keyboardState, updateLocalState]);

  type KeyDefinition = {
    event: string; // DOM event name
    display: string; // What to show on the button
    width?: string; // Optional custom width
    isModifier?: boolean; // Whether this is a modifier key
    isSpecial?: boolean; // Whether this is a special key
  };

  const letterKeyLayout = useMemo(
    (): KeyDefinition[][] => [
      [
        { event: "1", display: "1" },
        { event: "2", display: "2" },
        { event: "3", display: "3" },
        { event: "4", display: "4" },
        { event: "5", display: "5" },
        { event: "6", display: "6" },
        { event: "7", display: "7" },
        { event: "8", display: "8" },
        { event: "9", display: "9" },
        { event: "0", display: "0" },
      ],
      [
        { event: "q", display: "Q" },
        { event: "w", display: "W" },
        { event: "e", display: "E" },
        { event: "r", display: "R" },
        { event: "t", display: "T" },
        { event: "y", display: "Y" },
        { event: "u", display: "U" },
        { event: "i", display: "I" },
        { event: "o", display: "O" },
        { event: "p", display: "P" },
      ],
      [
        { event: "a", display: "A" },
        { event: "s", display: "S" },
        { event: "d", display: "D" },
        { event: "f", display: "F" },
        { event: "g", display: "G" },
        { event: "h", display: "H" },
        { event: "j", display: "J" },
        { event: "k", display: "K" },
        { event: "l", display: "L" },
      ],
      [
        { event: "Shift", display: "Shift", isModifier: true },
        { event: "z", display: "Z" },
        { event: "x", display: "X" },
        { event: "c", display: "C" },
        { event: "v", display: "V" },
        { event: "b", display: "B" },
        { event: "n", display: "N" },
        { event: "m", display: "M" },
        { event: "Backspace", display: "⌫", isSpecial: true },
        { event: "Delete", display: "Del", isSpecial: true },
      ],
      [
        { event: "SymbolMode", display: "!?#", width: "60px", isSpecial: true },
        { event: "Control", display: "Ctrl", width: "60px", isModifier: true },
        { event: "Alt", display: "Alt", width: "60px", isModifier: true },
        { event: "Space", display: "Space", width: "120px", isSpecial: true },
        { event: "Enter", display: "↵", isSpecial: true },
      ],
    ],
    [],
  );

  const symbolKeyLayout = useMemo(
    (): KeyDefinition[][] => [
      [
        { event: "!", display: "!" },
        { event: "@", display: "@" },
        { event: "#", display: "#" },
        { event: "$", display: "$" },
        { event: "%", display: "%" },
        { event: "^", display: "^" },
        { event: "&", display: "&" },
        { event: "*", display: "*" },
        { event: "(", display: "(" },
        { event: ")", display: ")" },
      ],
      [
        { event: "`", display: "`" },
        { event: "~", display: "~" },
        { event: "-", display: "-" },
        { event: "_", display: "_" },
        { event: "=", display: "=" },
        { event: "+", display: "+" },
        { event: "[", display: "[" },
        { event: "]", display: "]" },
        { event: "{", display: "{" },
        { event: "}", display: "}" },
      ],
      [
        { event: ";", display: ";" },
        { event: ":", display: ":" },
        { event: "'", display: "'" },
        { event: '"', display: '"' },
        { event: "\\", display: "\\" },
        { event: "|", display: "|" },
        { event: ",", display: "," },
        { event: ".", display: "." },
        { event: "<", display: "<" },
      ],
      [
        { event: "Shift", display: "Shift", isModifier: true },
        { event: "/", display: "/" },
        { event: "?", display: "?" },
        { event: ">", display: ">" },
        { event: "Tab", display: "Tab", width: "60px", isSpecial: true },
        { event: "Escape", display: "Esc", width: "60px", isSpecial: true },
        { event: "Backspace", display: "⌫", isSpecial: true },
        { event: "Delete", display: "Del", isSpecial: true },
      ],
      [
        { event: "LetterMode", display: "ABC", width: "60px", isSpecial: true },
        { event: "Control", display: "Ctrl", width: "60px", isModifier: true },
        { event: "Alt", display: "Alt", width: "60px", isModifier: true },
        { event: "Space", display: "Space", width: "120px", isSpecial: true },
        { event: "Enter", display: "↵", isSpecial: true },
      ],
    ],
    [],
  );

  const keyLayout = symbolMode ? symbolKeyLayout : letterKeyLayout;

  const handleKeyPress = useCallback(
    (eventKey: string, keyDef: KeyDefinition) => {
      const { isModifier = false } = keyDef;

      // Handle special mode switching keys
      if (eventKey === "SymbolMode") {
        setSymbolMode(true);
        return;
      } else if (eventKey === "LetterMode") {
        setSymbolMode(false);
        return;
      }

      keyboardState.virtualKeyPress(eventKey, isModifier, 0);
    },
    [keyboardState],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 p-2 w-full box-border select-none">
      {keyLayout.map((row, rowIndex) => (
        <div key={`row-${row.map(k => k.event).join("-")}`} className="flex gap-0.5 justify-center w-full">
          {row.map(keyDef => {
            const { event, display, width = "44px", isModifier = false } = keyDef;

            // Determine if this key should show as active (held or mode buttons)
            const isActive =
              (isModifier && heldKeys.has(event)) ||
              (event === "SymbolMode" && symbolMode) ||
              (event === "LetterMode" && !symbolMode);

            return (
              <KeyButton
                key={event}
                label={display}
                char={display}
                width={width}
                callbacks={{
                  ...callbacks,
                  onChar: () => handleKeyPress(event, keyDef),
                }}
                isActive={isActive}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
