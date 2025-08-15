import type React from "react";
import { useCallback, useState } from "react";
import type { ToolbarCallbacks, UIState } from "./types";

interface KeyButtonProps {
  label: string;
  char?: string;
  width?: string;
  callbacks: ToolbarCallbacks;
  isActive?: boolean;
}

export const KeyButton: React.FC<KeyButtonProps> = ({ label, char, width = "44px", callbacks, isActive = false }) => {
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

  const baseClasses =
    "h-11 border rounded-sm text-white text-xs cursor-pointer outline-none touch-manipulation select-none flex items-center justify-center p-0 transition-all duration-150";

  const getStateClasses = () => {
    if (isPressed) return "bg-gray-500/90 border-gray-400/90";
    if (isActive) return "bg-blue-600/90 border-blue-500";
    return "bg-gray-700/80 border-gray-600/80 hover:bg-gray-600/90";
  };

  return (
    <button
      type="button"
      className={`${baseClasses} ${getStateClasses()}`}
      style={{ width }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {label === "Space" ? "␣" : label}
    </button>
  );
};
