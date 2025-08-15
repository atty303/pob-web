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
      ? "pw:bottom-16 pw:left-1/2 pw:transform pw:-translate-x-1/2"
      : "pw:right-16 pw:top-1/2 pw:transform pw:-translate-y-1/2";

  return (
    <div
      className={`pw:absolute ${positionClasses} pw:z-50 pw:p-3 pw:bg-gray-800 pw:rounded-lg pw:shadow-xl pw:border pw:border-gray-600 pw:min-w-64`}
    >
      <div className="pw:flex pw:flex-col pw:gap-3">
        {/* Zoom Controls */}
        <div className="pw:flex pw:items-center pw:gap-3">
          {/* Reset Button */}
          <button
            type="button"
            onClick={onZoomReset}
            className="pw:p-2 pw:bg-gray-700 hover:pw:bg-gray-600 pw:rounded-md pw:transition-colors pw:duration-200"
            title="Reset Zoom"
          >
            <MdRefresh size={16} className="pw:text-white" />
          </button>

          {/* Zoom Slider */}
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.1}
            value={currentZoom}
            onChange={handleSliderChange}
            className="pw:flex-1 pw:h-2 pw:bg-gray-700 pw:rounded-lg pw:appearance-none pw:cursor-pointer slider"
          />

          {/* Current Zoom Display */}
          <span className="pw:text-sm pw:font-medium pw:text-white pw:min-w-12 pw:text-center">{zoomPercentage}%</span>
        </div>

        {/* Canvas Size Controls */}
        <div className="pw:border-t pw:border-gray-600 pw:pt-3">
          <div className="pw:text-xs pw:text-gray-300 pw:mb-2">Canvas Size</div>
          <div className="pw:flex pw:items-center pw:gap-2">
            <input
              type="number"
              value={canvasWidth}
              onChange={handleWidthChange}
              onBlur={handleWidthBlur}
              className="pw:w-20 pw:px-2 pw:py-1 pw:text-xs pw:bg-gray-700 pw:border pw:border-gray-600 pw:rounded pw:text-white"
              placeholder="W"
              min="50"
              max="8000"
              step="50"
            />
            <span className="pw:text-xs pw:text-gray-400">×</span>
            <input
              type="number"
              value={canvasHeight}
              onChange={handleHeightChange}
              onBlur={handleHeightBlur}
              className="pw:w-20 pw:px-2 pw:py-1 pw:text-xs pw:bg-gray-700 pw:border pw:border-gray-600 pw:rounded pw:text-white"
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
