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
    "pw:w-11 pw:h-11 pw:border pw:border-white/30 pw:rounded pw:text-white pw:text-xl pw:cursor-pointer pw:outline-none pw:touch-manipulation pw:transition-all pw:duration-150 pw:select-none pw:flex pw:items-center pw:justify-center";

  const getStateClasses = () => {
    if (isPressed) return "pw:bg-white/30 pw:border-white/50";
    if (isActive) return "pw:bg-blue-600/80 pw:border-blue-500 pw:scale-95";
    return "pw:bg-white/10 hover:pw:bg-white/20";
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
