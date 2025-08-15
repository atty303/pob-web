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

  const containerClasses = `pw:navbar pw:bg-base-200/95 pw:shadow-lg pw:select-none pw:relative ${
    isLandscape ? "pw:flex-col pw:justify-center pw:h-full" : "pw:flex-row pw:justify-center pw:w-full"
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
