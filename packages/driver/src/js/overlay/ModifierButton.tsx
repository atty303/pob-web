import type React from "react";
import { useCallback } from "react";
import type { ModifierKeys } from "./types";

interface ModifierButtonProps {
  modifierKey: keyof ModifierKeys;
  label: string;
  isActive: boolean;
  onToggle: (key: keyof ModifierKeys) => void;
}

export const ModifierButton: React.FC<ModifierButtonProps> = ({ modifierKey, label, isActive, onToggle }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle(modifierKey);
    },
    [modifierKey, onToggle],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle(modifierKey);
    },
    [modifierKey, onToggle],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      style={{
        width: "44px",
        height: "44px",
        background: isActive ? "rgba(0, 123, 255, 0.8)" : "rgba(255, 255, 255, 0.1)",
        border: `1px solid ${isActive ? "rgba(0, 123, 255, 1)" : "rgba(255, 255, 255, 0.3)"}`,
        borderRadius: "3px",
        color: "white",
        fontSize: "13px",
        fontWeight: "bold",
        cursor: "pointer",
        outline: "none",
        touchAction: "manipulation",
        transition: "all 0.15s ease",
        userSelect: "none",
        WebkitUserSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: isActive ? "scale(0.95)" : "scale(1)",
      }}
    >
      {label}
    </button>
  );
};
