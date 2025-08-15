import type React from "react";
import { useCallback, useState } from "react";

interface ControlButtonProps {
  icon: string | React.ReactNode;
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

  const baseClasses = "pw:btn pw:btn-square pw:btn-ghost";

  const getStateClasses = () => {
    if (isPressed) return "pw:btn-active";
    if (isActive) return "pw:btn-primary pw:scale-95";
    return "";
  };

  return (
    <button
      type="button"
      title={tooltip}
      className={`${baseClasses} ${getStateClasses()}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {icon}
    </button>
  );
};
