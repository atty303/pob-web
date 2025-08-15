import React, { useCallback, useState } from "react";
import { MdRefresh } from "react-icons/md";

interface ZoomControlProps {
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  onZoomReset: () => void;
  onCanvasSizeChange?: (width: number, height: number) => void;
  currentCanvasSize?: { width: number; height: number };
  isVisible: boolean;
  position: "bottom" | "right" | "left" | "top";
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  currentZoom,
  minZoom,
  maxZoom,
  onZoomChange,
  onZoomReset,
  onCanvasSizeChange,
  currentCanvasSize = { width: 1520, height: 800 },
  isVisible,
  position,
}) => {
  const [canvasWidth, setCanvasWidth] = useState(currentCanvasSize.width.toString());
  const [canvasHeight, setCanvasHeight] = useState(currentCanvasSize.height.toString());

  // Update local state when currentCanvasSize prop changes
  React.useEffect(() => {
    setCanvasWidth(currentCanvasSize.width.toString());
    setCanvasHeight(currentCanvasSize.height.toString());
  }, [currentCanvasSize.width, currentCanvasSize.height]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseFloat(e.target.value);
      onZoomChange(value);
    },
    [onZoomChange],
  );

  const applyCanvasSize = useCallback(
    (width: string, height: string) => {
      const w = Number.parseInt(width, 10);
      const h = Number.parseInt(height, 10);

      if (w > 0 && h > 0 && onCanvasSizeChange) {
        onCanvasSizeChange(w, h);
      }
    },
    [onCanvasSizeChange],
  );

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newWidth = e.target.value;
      setCanvasWidth(newWidth);
      applyCanvasSize(newWidth, canvasHeight);
    },
    [canvasHeight, applyCanvasSize],
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHeight = e.target.value;
      setCanvasHeight(newHeight);
      applyCanvasSize(canvasWidth, newHeight);
    },
    [canvasWidth, applyCanvasSize],
  );

  const handleWidthBlur = useCallback(() => {
    applyCanvasSize(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight, applyCanvasSize]);

  const handleHeightBlur = useCallback(() => {
    applyCanvasSize(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight, applyCanvasSize]);

  const zoomPercentage = Math.round(currentZoom * 100);

  if (!isVisible) return null;

  const positionClasses =
    position === "bottom"
      ? "bottom-16 left-1/2 transform -translate-x-1/2"
      : "right-16 top-1/2 transform -translate-y-1/2";

  return (
    <div
      className={`absolute ${positionClasses} z-50 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-600 min-w-64`}
    >
      <div className="flex flex-col gap-3">
        {/* Zoom Controls */}
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
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />

          {/* Current Zoom Display */}
          <span className="text-sm font-medium text-white min-w-12 text-center">{zoomPercentage}%</span>
        </div>

        {/* Canvas Size Controls */}
        <div className="border-t border-gray-600 pt-3">
          <div className="text-xs text-gray-300 mb-2">Canvas Size</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={canvasWidth}
              onChange={handleWidthChange}
              onBlur={handleWidthBlur}
              className="w-20 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="W"
              min="50"
              max="8000"
              step="50"
            />
            <span className="text-xs text-gray-400">×</span>
            <input
              type="number"
              value={canvasHeight}
              onChange={handleHeightChange}
              onBlur={handleHeightBlur}
              className="w-20 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="H"
              min="50"
              max="8000"
              step="50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
