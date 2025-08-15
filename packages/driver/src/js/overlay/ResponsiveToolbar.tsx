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
}

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  callbacks,
  position,
  isLandscape,
  panModeEnabled,
  keyboardVisible,
  currentZoom = 1.0,
}) => {
  const [zoomControlVisible, setZoomControlVisible] = useState(false);

  const handlePanModeToggle = useCallback(() => {
    callbacks.onPanModeToggle(!panModeEnabled);
  }, [callbacks, panModeEnabled]);

  const handleZoomToggle = useCallback(() => {
    setZoomControlVisible(prev => !prev);
  }, []);

  const containerStyle = useMemo(() => {
    const baseStyle = {
      width: "100%",
      height: "100%",
      background: "rgba(40, 40, 40, 0.95)",
      border: "1px solid rgba(60, 60, 60, 0.8)",
      padding: "8px",
      userSelect: "none" as const,
      WebkitUserSelect: "none" as const,
      display: "flex",
      alignItems: "center",
      gap: "6px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
      borderRadius: "0",
      boxSizing: "border-box" as const,
    };

    if (isLandscape) {
      return {
        ...baseStyle,
        flexDirection: "column" as const,
        justifyContent: "center",
      };
    } else {
      return {
        ...baseStyle,
        flexDirection: "row" as const,
        justifyContent: "center",
      };
    }
  }, [isLandscape]);

  return (
    <div style={containerStyle} className="flex items-center gap-2 relative">
      <ControlButton
        icon={<HiMagnifyingGlass size={24} />}
        tooltip="Zoom Controls"
        onClick={handleZoomToggle}
        isActive={zoomControlVisible}
      />

      <FullscreenButton onToggle={callbacks.onFullscreenToggle} />

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
        isVisible={zoomControlVisible}
        position={position}
      />
    </div>
  );
};
