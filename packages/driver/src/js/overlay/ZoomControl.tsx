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
      ? "O-bottom-16 O-left-1/2 O-transform O--translate-x-1/2"
      : "O-right-16 O-top-1/2 O-transform O--translate-y-1/2";

  return (
    <div
      className={`O-absolute ${positionClasses} O-z-50 O-p-3 O-bg-gray-800 O-rounded-lg O-shadow-xl O-border O-border-gray-600 O-min-w-64`}
    >
      <div className="O-flex O-flex-col O-gap-3">
        {/* Zoom Controls */}
        <div className="O-flex O-items-center O-gap-3">
          {/* Reset Button */}
          <button
            type="button"
            onClick={onZoomReset}
            className="O-p-2 O-bg-gray-700 hover:O-bg-gray-600 O-rounded-md O-transition-colors O-duration-200"
            title="Reset Zoom"
          >
            <MdRefresh size={16} className="O-text-white" />
          </button>

          {/* Zoom Slider */}
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.1}
            value={currentZoom}
            onChange={handleSliderChange}
            className="O-flex-1 O-h-2 O-bg-gray-700 O-rounded-lg O-appearance-none O-cursor-pointer slider"
          />

          {/* Current Zoom Display */}
          <span className="O-text-sm O-font-medium O-text-white O-min-w-12 O-text-center">{zoomPercentage}%</span>
        </div>

        {/* Canvas Size Controls */}
        <div className="O-border-t O-border-gray-600 O-pt-3">
          <div className="O-text-xs O-text-gray-300 O-mb-2">Canvas Size</div>
          <div className="O-flex O-items-center O-gap-2">
            <input
              type="number"
              value={canvasWidth}
              onChange={handleWidthChange}
              onBlur={handleWidthBlur}
              className="O-w-20 O-px-2 O-py-1 O-text-xs O-bg-gray-700 O-border O-border-gray-600 O-rounded O-text-white"
              placeholder="W"
              min="50"
              max="8000"
              step="50"
            />
            <span className="O-text-xs O-text-gray-400">×</span>
            <input
              type="number"
              value={canvasHeight}
              onChange={handleHeightChange}
              onBlur={handleHeightBlur}
              className="O-w-20 O-px-2 O-py-1 O-text-xs O-bg-gray-700 O-border O-border-gray-600 O-rounded O-text-white"
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
