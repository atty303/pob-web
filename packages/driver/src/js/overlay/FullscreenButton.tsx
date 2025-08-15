import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

interface FullscreenButtonProps {
  onToggle: () => void;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({ onToggle }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
      onToggle();
    },
    [onToggle],
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
      onToggle();
    },
    [onToggle],
  );

  const IconComponent = isFullscreen ? <MdFullscreenExit size={24} /> : <MdFullscreen size={24} />;
  const tooltip = isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen";

  const baseClasses =
    "w-11 h-11 border border-white/30 rounded text-white cursor-pointer outline-none touch-manipulation transition-all duration-150 select-none flex items-center justify-center p-2";
  const stateClasses = isPressed ? "bg-white/30" : "bg-white/10 hover:bg-white/20";

  return (
    <button
      type="button"
      title={tooltip}
      className={`${baseClasses} ${stateClasses}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {IconComponent}
    </button>
  );
};
