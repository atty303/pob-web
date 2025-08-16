import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { CiKeyboard } from "react-icons/ci";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";
import { PiCursorThin } from "react-icons/pi";
import { ToolbarButton } from "./ToolbarButton";
import { ZoomControl } from "./ZoomControl";
import type { ToolbarCallbacks, ToolbarPosition } from "./types";
import { useFullscreen } from "./useFullscreen";

interface ToolbarProps {
  callbacks: ToolbarCallbacks;
  position: ToolbarPosition;
  isLandscape: boolean;
  panModeEnabled: boolean;
  keyboardVisible: boolean;
  performanceVisible?: boolean;
  currentZoom?: number;
  currentCanvasSize?: { width: number; height: number };
  isFixedSize?: boolean;
  externalComponent?: React.ComponentType<{ position: ToolbarPosition; isLandscape: boolean }>;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  callbacks,
  position,
  isLandscape,
  panModeEnabled,
  keyboardVisible,
  performanceVisible = false,
  currentZoom = 1.0,
  currentCanvasSize = { width: 1520, height: 800 },
  isFixedSize = false,
  externalComponent: ExternalComponent,
}) => {
  const [zoomControlVisible, setZoomControlVisible] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const handlePanModeToggle = useCallback(() => {
    callbacks.onPanModeToggle(!panModeEnabled);
  }, [callbacks, panModeEnabled]);

  const handleZoomToggle = useCallback(() => {
    setZoomControlVisible(prev => !prev);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    toggleFullscreen();
    callbacks.onFullscreenToggle();
  }, [toggleFullscreen, callbacks]);

  const containerClasses = `pw:navbar pw:bg-base-200/95 pw:shadow-lg pw:select-none pw:relative pw:gap-1 ${
    isLandscape ? "pw:flex-col pw:justify-center pw:h-full" : "pw:flex-row pw:justify-center pw:w-full"
  }`;

  const fullscreenIcon = isFullscreen ? <MdFullscreenExit size={24} /> : <MdFullscreen size={24} />;
  const fullscreenTooltip = isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen";

  return (
    <div className={containerClasses}>
      {ExternalComponent && <div className="pw:flex-grow" />}

      <ToolbarButton
        icon={<PiCursorThin size={24} />}
        tooltip="Toggle Pan Tool"
        onClick={handlePanModeToggle}
        isActive={panModeEnabled}
      />

      <ToolbarButton
        icon={<CiKeyboard size={24} />}
        tooltip="Toggle Virtual Keyboard"
        onClick={callbacks.onKeyboardToggle}
        isActive={keyboardVisible}
      />

      <ToolbarButton
        icon={<HiMagnifyingGlass size={24} />}
        tooltip="Zoom Controls"
        onClick={handleZoomToggle}
        isActive={zoomControlVisible}
      />

      <ToolbarButton
        icon={fullscreenIcon}
        tooltip={fullscreenTooltip}
        onClick={handleFullscreenToggle}
        isActive={isFullscreen}
      />

      {ExternalComponent && <div className="pw:flex-grow" />}

      {ExternalComponent && <ExternalComponent position={position} isLandscape={isLandscape} />}

      <ZoomControl
        currentZoom={currentZoom}
        minZoom={0.1}
        maxZoom={2.0}
        onZoomChange={callbacks.onZoomChange}
        onZoomReset={callbacks.onZoomReset}
        onCanvasSizeChange={callbacks.onCanvasSizeChange}
        onFixedSizeToggle={callbacks.onFixedSizeToggle}
        currentCanvasSize={currentCanvasSize}
        isFixedSize={isFixedSize}
        isVisible={zoomControlVisible}
        position={position}
      />
    </div>
  );
};
