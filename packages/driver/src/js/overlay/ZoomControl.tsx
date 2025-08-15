import type React from "react";
import { useCallback } from "react";
import { MdRefresh } from "react-icons/md";

interface ZoomControlProps {
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  onZoomReset: () => void;
  isVisible: boolean;
  position: "bottom" | "right" | "left" | "top";
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  currentZoom,
  minZoom,
  maxZoom,
  onZoomChange,
  onZoomReset,
  isVisible,
  position,
}) => {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseFloat(e.target.value);
      onZoomChange(value);
    },
    [onZoomChange],
  );

  const zoomPercentage = Math.round(currentZoom * 100);

  if (!isVisible) return null;

  const positionClasses =
    position === "bottom"
      ? "bottom-16 left-1/2 transform -translate-x-1/2"
      : "right-16 top-1/2 transform -translate-y-1/2";

  return (
    <div className={`absolute ${positionClasses} z-50 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-600`}>
      <div className="flex items-center gap-3">
        {/* Reset Button */}
        <button
          type="button"
          onClick={onZoomReset}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
          title="Reset Zoom"
        >
          <MdRefresh size={16} className="text-white" />
        </button>

        {/* Zoom Slider */}
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.1}
          value={currentZoom}
          onChange={handleSliderChange}
          className="w-40 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />

        {/* Current Zoom Display */}
        <span className="text-sm font-medium text-white min-w-12 text-center">{zoomPercentage}%</span>
      </div>
    </div>
  );
};
