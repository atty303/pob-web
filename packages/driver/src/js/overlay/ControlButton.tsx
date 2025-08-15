import type React from "react";
import { useCallback, useState } from "react";

interface ControlButtonProps {
  icon: string;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
}

export const ControlButton: React.FC<ControlButtonProps> = ({ icon, tooltip, onClick, isActive = false }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    },
    [onClick],
  );

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
      onClick();
    },
    [onClick],
  );

  const getBackgroundColor = () => {
    if (isPressed) return "rgba(255, 255, 255, 0.3)";
    if (isActive) return "rgba(0, 123, 255, 0.8)";
    return "rgba(255, 255, 255, 0.1)";
  };

  return (
    <button
      type="button"
      title={tooltip}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        width: "44px",
        height: "44px",
        background: getBackgroundColor(),
        border: `1px solid ${isActive ? "rgba(0, 123, 255, 1)" : "rgba(255, 255, 255, 0.3)"}`,
        borderRadius: "3px",
        color: "white",
        fontSize: "20px",
        cursor: "pointer",
        outline: "none",
        touchAction: "manipulation",
        transition: "background 0.15s ease",
        userSelect: "none",
        WebkitUserSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: isActive ? "scale(0.95)" : "scale(1)",
      }}
    >
      {icon}
    </button>
  );
};
