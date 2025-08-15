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
        background: isPressed ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "3px",
        color: "white",
        cursor: "pointer",
        outline: "none",
        touchAction: "manipulation",
        transition: "background 0.15s ease",
        userSelect: "none",
        WebkitUserSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      }}
    >
      {IconComponent}
    </button>
  );
};
