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
    "pw:h-11 pw:border pw:rounded-sm pw:text-white pw:text-xs pw:cursor-pointer pw:outline-none pw:touch-manipulation pw:select-none pw:flex pw:items-center pw:justify-center pw:p-0 pw:transition-all pw:duration-150";

  const getStateClasses = () => {
    if (isPressed) return "pw:bg-gray-500/90 pw:border-gray-400/90";
    if (isActive) return "pw:bg-blue-600/90 pw:border-blue-500";
    return "pw:bg-gray-700/80 pw:border-gray-600/80 hover:pw:bg-gray-600/90";
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
