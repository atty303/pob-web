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

  const baseClasses =
    "w-11 h-11 border border-white/30 rounded text-white text-xl cursor-pointer outline-none touch-manipulation transition-all duration-150 select-none flex items-center justify-center";

  const getStateClasses = () => {
    if (isPressed) return "bg-white/30 border-white/50";
    if (isActive) return "bg-blue-600/80 border-blue-500 scale-95";
    return "bg-white/10 hover:bg-white/20";
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
