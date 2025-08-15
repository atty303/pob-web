import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { CiKeyboard } from "react-icons/ci";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { MdOutlinePanTool } from "react-icons/md";
import { ControlButton } from "./ControlButton";
import { FullscreenButton } from "./FullscreenButton";
import { ZoomControl } from "./ZoomControl";
import type { ToolbarCallbacks, ToolbarPosition } from "./types";

interface ResponsiveToolbarProps {
  callbacks: ToolbarCallbacks;
  position: ToolbarPosition;
  isLandscape: boolean;
  panModeEnabled: boolean;
  keyboardVisible: boolean;
  currentZoom?: number;
  currentCanvasSize?: { width: number; height: number };
}

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  callbacks,
  position,
  isLandscape,
  panModeEnabled,
  keyboardVisible,
  currentZoom = 1.0,
  currentCanvasSize = { width: 1520, height: 800 },
}) => {
  const [zoomControlVisible, setZoomControlVisible] = useState(false);

  const handlePanModeToggle = useCallback(() => {
    callbacks.onPanModeToggle(!panModeEnabled);
  }, [callbacks, panModeEnabled]);

  const handleZoomToggle = useCallback(() => {
    setZoomControlVisible(prev => !prev);
  }, []);

  const containerClasses = `w-full h-full bg-gray-700/95 border border-gray-600/80 p-2 select-none flex items-center gap-1.5 shadow-lg box-border relative ${
    isLandscape ? "flex-col justify-center" : "flex-row justify-center"
  }`;

  return (
    <div className={containerClasses}>
      <FullscreenButton onToggle={callbacks.onFullscreenToggle} />

      <ControlButton
        icon={<HiMagnifyingGlass size={24} />}
        tooltip="Zoom Controls"
        onClick={handleZoomToggle}
        isActive={zoomControlVisible}
      />

      <ControlButton
        icon={<MdOutlinePanTool size={24} />}
        tooltip="Toggle Pan Tool"
        onClick={handlePanModeToggle}
        isActive={panModeEnabled}
      />

      <ControlButton
        icon={<CiKeyboard size={24} />}
        tooltip="Toggle Virtual Keyboard"
        onClick={callbacks.onKeyboardToggle}
        isActive={keyboardVisible}
      />

      <ZoomControl
        currentZoom={currentZoom}
        minZoom={0.5}
        maxZoom={3.0}
        onZoomChange={callbacks.onZoomChange}
        onZoomReset={callbacks.onZoomReset}
        onCanvasSizeChange={callbacks.onCanvasSizeChange}
        currentCanvasSize={currentCanvasSize}
        isVisible={zoomControlVisible}
        position={position}
      />
    </div>
  );
};
