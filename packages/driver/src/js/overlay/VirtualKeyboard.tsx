import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { KeyButton } from "./KeyButton";
import type { ModifierKeys, ToolbarCallbacks, UIState } from "./types";

interface VirtualKeyboardProps {
  isVisible: boolean;
  callbacks: ToolbarCallbacks;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isVisible, callbacks }) => {
  const [holdMode, setHoldMode] = useState(false);
  const [heldKeys, setHeldKeys] = useState<Set<string>>(new Set());

  const handleHoldToggle = useCallback(() => {
    setHoldMode(prev => !prev);
    // Clear character keys when turning off hold mode (keep modifier keys)
    if (holdMode) {
      setHeldKeys(prev => new Set([...prev].filter(key => isModifierKey(key))));
    }
  }, [holdMode]);

  const keyLayout = useMemo(
    () => [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Hold"],
      ["Shift", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
      ["Ctrl", "Alt", "Space", "↵"],
    ],
    [],
  );

  const getKeyProps = (key: string) => {
    let width = "44px";
    let char = key.toLowerCase();

    if (key === "Space") {
      width = "88px"; // Moderate width for space bar
      char = " ";
    } else if (key === "⌫") {
      width = "44px";
      char = "\b";
    } else if (key === "↵") {
      width = "44px";
      char = "\r";
    } else if (key === "Ctrl" || key === "Shift" || key === "Alt") {
      width = "60px"; // Wider for modifier keys
    } else if (key === "Hold") {
      width = "60px"; // Wider for hold button
    }

    return { width, char };
  };

  const isModifierKey = useCallback((key: string): key is keyof ModifierKeys => {
    return key === "Ctrl" || key === "Shift" || key === "Alt";
  }, []);

  const isCharacterKey = useCallback((key: string): boolean => {
    // Check if it's a letter or number
    return /^[A-Za-z0-9]$/.test(key);
  }, []);

  const isHoldableKey = (key: string): boolean => {
    // Character keys and modifier keys can be held
    return isCharacterKey(key) || isModifierKey(key);
  };

  const handleKeyPress = useCallback(
    (key: string, char: string) => {
      if (isModifierKey(key) || (holdMode && isCharacterKey(key))) {
        // Modifier keys always behave as hold keys, character keys in hold mode
        setHeldKeys(prev => {
          const newHeldKeys = new Set(prev);
          if (newHeldKeys.has(key)) {
            // Key is already held, release it
            newHeldKeys.delete(key);
            callbacks.onKeyUp(key, 0, { x: 0, y: 0, keys: newHeldKeys });
          } else {
            // Key is not held, press it
            newHeldKeys.add(key);
            callbacks.onKeyDown(key, 0, { x: 0, y: 0, keys: newHeldKeys });
          }
          return newHeldKeys;
        });
      } else {
        // Normal key press behavior - include currently held keys
        callbacks.onChar(char, 0, { x: 0, y: 0, keys: heldKeys });
      }
    },
    [holdMode, callbacks, heldKeys, isModifierKey, isCharacterKey],
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
      {keyLayout.map(row => (
        <div
          key={row.join("-")}
          style={{
            display: "flex",
            gap: "2px",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {row.map(key => {
            const { width, char } = getKeyProps(key);

            if (isModifierKey(key)) {
              const isActive = heldKeys.has(key);
              return (
                <KeyButton
                  key={key}
                  label={key}
                  char={char}
                  width={width}
                  callbacks={{
                    ...callbacks,
                    onChar: () => handleKeyPress(key, char),
                  }}
                  isActive={isActive}
                />
              );
            }

            if (key === "Hold") {
              return (
                <KeyButton
                  key={key}
                  label={key}
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

            // Handle character keys with hold mode
            if (holdMode && isCharacterKey(key)) {
              const isHeld = heldKeys.has(key);
              return (
                <KeyButton
                  key={key}
                  label={key}
                  char={char}
                  width={width}
                  callbacks={{
                    ...callbacks,
                    onChar: () => handleKeyPress(key, char),
                  }}
                  isActive={isHeld}
                />
              );
            }

            // For non-character keys, wrap callbacks to include held keys in UIState
            const wrappedCallbacks = {
              ...callbacks,
              onChar: (char: string, doubleClick: number, uiState: UIState) => {
                const enhancedUIState = {
                  ...uiState,
                  keys: new Set([...heldKeys, ...uiState.keys]),
                };
                callbacks.onChar(char, doubleClick, enhancedUIState);
              },
              onKeyDown: (key: string, doubleClick: number, uiState: UIState) => {
                const enhancedUIState = {
                  ...uiState,
                  keys: new Set([...heldKeys, ...uiState.keys]),
                };
                callbacks.onKeyDown(key, doubleClick, enhancedUIState);
              },
              onKeyUp: (key: string, doubleClick: number, uiState: UIState) => {
                const enhancedUIState = {
                  ...uiState,
                  keys: new Set([...heldKeys, ...uiState.keys]),
                };
                callbacks.onKeyUp(key, doubleClick, enhancedUIState);
              },
            };

            return <KeyButton key={key} label={key} char={char} width={width} callbacks={wrappedCallbacks} />;
          })}
        </div>
      ))}
    </div>
  );
};
