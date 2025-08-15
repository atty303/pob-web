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
  const [holdMode, setHoldMode] = useState(keyboardState.holdMode);
  const [heldKeys, setHeldKeys] = useState(keyboardState.heldKeys);

  // Update local state when keyboard state changes
  const updateLocalState = useCallback(() => {
    setHoldMode(keyboardState.holdMode);
    setHeldKeys(new Set(keyboardState.heldKeys));
  }, [keyboardState]);

  // Listen for keyboard state changes
  useEffect(() => {
    keyboardState.addChangeListener(updateLocalState);
    return () => {
      keyboardState.removeChangeListener(updateLocalState);
    };
  }, [keyboardState, updateLocalState]);

  const handleHoldToggle = useCallback(() => {
    keyboardState.setHoldMode(!holdMode);
  }, [holdMode, keyboardState]);

  type KeyDefinition = {
    event: string; // DOM event name
    display: string; // What to show on the button
    width?: string; // Optional custom width
    isModifier?: boolean; // Whether this is a modifier key
    isSpecial?: boolean; // Whether this is a special key (excluded from hold mode)
  };

  const keyLayout = useMemo(
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
        { event: "Q", display: "Q" },
        { event: "W", display: "W" },
        { event: "E", display: "E" },
        { event: "R", display: "R" },
        { event: "T", display: "T" },
        { event: "Y", display: "Y" },
        { event: "U", display: "U" },
        { event: "I", display: "I" },
        { event: "O", display: "O" },
        { event: "P", display: "P" },
      ],
      [
        { event: "A", display: "A" },
        { event: "S", display: "S" },
        { event: "D", display: "D" },
        { event: "F", display: "F" },
        { event: "G", display: "G" },
        { event: "H", display: "H" },
        { event: "J", display: "J" },
        { event: "K", display: "K" },
        { event: "L", display: "L" },
        { event: "Hold", display: "Hold", width: "60px", isSpecial: true },
      ],
      [
        { event: "Shift", display: "Shift", width: "60px", isModifier: true },
        { event: "Z", display: "Z" },
        { event: "X", display: "X" },
        { event: "C", display: "C" },
        { event: "V", display: "V" },
        { event: "B", display: "B" },
        { event: "N", display: "N" },
        { event: "M", display: "M" },
        { event: "Backspace", display: "⌫", isSpecial: true },
      ],
      [
        { event: "Control", display: "Ctrl", width: "60px", isModifier: true },
        { event: "Alt", display: "Alt", width: "60px", isModifier: true },
        { event: "Space", display: "Space", width: "88px", isSpecial: true },
        { event: "Enter", display: "↵", isSpecial: true },
      ],
    ],
    [],
  );

  const handleKeyPress = useCallback(
    (eventKey: string, keyDef: KeyDefinition) => {
      const { isModifier = false, isSpecial = false } = keyDef;

      if (isModifier) {
        // Modifier keys always use toggle hold behavior
        keyboardState.toggleHold(eventKey, 0);
      } else if (holdMode && !isSpecial) {
        // In hold mode, character keys use toggle hold behavior
        keyboardState.toggleHold(eventKey, 0);
      } else {
        // Simulate physical keyboard: keydown -> keyup sequence
        keyboardState.keydown(eventKey, 0);
        keyboardState.keypress(eventKey);
        keyboardState.keyup(eventKey, 0);
      }
    },
    [keyboardState, holdMode],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "8px",
        background: "rgba(32, 32, 32, 0.95)",
        border: "1px solid rgba(60, 60, 60, 0.8)",
        borderRadius: "4px",
        width: "100%",
        boxSizing: "border-box",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {keyLayout.map((row, rowIndex) => (
        <div
          key={`row-${row.map(k => k.event).join("-")}`}
          style={{
            display: "flex",
            gap: "2px",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {row.map(keyDef => {
            const { event, display, width = "44px", isModifier = false, isSpecial = false } = keyDef;

            if (event === "Hold") {
              return (
                <KeyButton
                  key={event}
                  label={display}
                  char=""
                  width={width}
                  callbacks={{
                    ...callbacks,
                    onChar: handleHoldToggle,
                  }}
                  isActive={holdMode}
                />
              );
            }

            // Determine if this key should show as active (held)
            const isActive = (isModifier || (holdMode && !isSpecial)) && heldKeys.has(event);

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
