import type React from "react";
import { useCallback } from "react";
import type { ToolbarCallbacks, UIState } from "./types";

interface KeyButtonProps {
  label: string;
  char?: string;
  width?: string;
  callbacks: ToolbarCallbacks;
  isActive?: boolean;
}

export const KeyButton: React.FC<KeyButtonProps> = ({ label, char, width = "44px", callbacks, isActive = false }) => {
  const executeAction = useCallback(() => {
    const charToSend = char || label.toLowerCase();
    const uiState: UIState = { x: 0, y: 0, keys: new Set() };

    callbacks.onChar(charToSend, 0, uiState);

    // Send key events for special keys
    if (label === "⌫" || label === "↵") {
      const keyName = label === "⌫" ? "BACK" : "RETURN";
      callbacks.onKeyDown(keyName, 0, uiState);
      setTimeout(() => {
        callbacks.onKeyUp(keyName, 0, uiState);
      }, 50);
    }
  }, [char, label, callbacks]);

  const baseClasses = "pw:btn pw:btn-md pw:h-10";
  const variantClasses = isActive ? "pw:btn-primary" : "pw:btn-neutral pw:opacity-80";

  return (
    <button type="button" className={`${baseClasses} ${variantClasses}`} style={{ width }} onClick={executeAction}>
      {label === "Space" ? "␣" : label}
    </button>
  );
};
