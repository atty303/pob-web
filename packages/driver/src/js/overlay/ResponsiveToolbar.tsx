import type React from "react";
import { useCallback, useMemo } from "react";
import { CiKeyboard } from "react-icons/ci";
import { ControlButton } from "./ControlButton";
import { FullscreenButton } from "./FullscreenButton";
import { ModifierButton } from "./ModifierButton";
import type { ModifierKeys, ToolbarCallbacks, ToolbarPosition } from "./types";

interface ResponsiveToolbarProps {
  modifiers: ModifierKeys;
  onModifierToggle: (key: keyof ModifierKeys) => void;
  callbacks: ToolbarCallbacks;
  position: ToolbarPosition;
  isLandscape: boolean;
  dragModeEnabled: boolean;
  keyboardVisible: boolean;
}

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  modifiers,
  onModifierToggle,
  callbacks,
  position,
  isLandscape,
  dragModeEnabled,
  keyboardVisible,
}) => {
  const handleDragModeToggle = useCallback(() => {
    callbacks.onDragModeToggle(!dragModeEnabled);
  }, [callbacks, dragModeEnabled]);

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

  const modifierButtons = useMemo(
    () => [
      { key: "ctrl" as const, label: "Ctrl" },
      { key: "shift" as const, label: "Shift" },
      { key: "alt" as const, label: "Alt" },
    ],
    [],
  );

  return (
    <div style={containerStyle}>
      {modifierButtons.map(({ key, label }) => (
        <ModifierButton
          key={key}
          modifierKey={key}
          label={label}
          isActive={modifiers[key]}
          onToggle={onModifierToggle}
        />
      ))}

      <ControlButton icon="🔄" tooltip="Reset Zoom" onClick={callbacks.onZoomReset} />

      <FullscreenButton onToggle={callbacks.onFullscreenToggle} />

      <ControlButton icon="🖱️" tooltip="Toggle Drag Mode" onClick={handleDragModeToggle} isActive={dragModeEnabled} />

      <ControlButton
        icon={<CiKeyboard size={24} />}
        tooltip="Toggle Virtual Keyboard"
        onClick={callbacks.onKeyboardToggle}
        isActive={keyboardVisible}
      />
    </div>
  );
};
