import type React from "react";
import { useCallback, useState } from "react";
import type { ToolbarCallbacks, UIState } from "./types";

interface KeyButtonProps {
  label: string;
  char?: string;
  width?: string;
  callbacks: ToolbarCallbacks;
}

export const KeyButton: React.FC<KeyButtonProps> = ({ label, char, width = "44px", callbacks }) => {
  const [isPressed, setIsPressed] = useState(false);

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(true);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsPressed(false);
      executeAction();
    },
    [executeAction],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      executeAction();
    },
    [executeAction],
  );

  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        width,
        height: "44px",
        background: isPressed ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "2px",
        color: "white",
        fontSize: "13px",
        cursor: "pointer",
        outline: "none",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        transition: "background 0.15s ease",
      }}
    >
      {label === "Space" ? "␣" : label}
    </button>
  );
};
