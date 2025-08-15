import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ResponsiveToolbar } from "./ResponsiveToolbar";
import { VirtualKeyboard } from "./VirtualKeyboard";
import type { ModifierKeys, ToolbarCallbacks, ToolbarPosition } from "./types";

interface OverlayContainerProps {
  modifierKeyManager: {
    modifiers: ModifierKeys;
    toggleModifier: (key: keyof ModifierKeys) => void;
  };
  callbacks: ToolbarCallbacks;
}

export const OverlayContainer: React.FC<OverlayContainerProps> = ({ modifierKeyManager, callbacks }) => {
  const [modifiers, setModifiers] = useState<ModifierKeys>(modifierKeyManager.modifiers);
  const [position, setPosition] = useState<ToolbarPosition>("bottom");
  const [isLandscape, setIsLandscape] = useState(false);
  const [dragModeEnabled, setDragModeEnabled] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const handleModifierToggle = useCallback(
    (key: keyof ModifierKeys) => {
      modifierKeyManager.toggleModifier(key);
      setModifiers({ ...modifierKeyManager.modifiers });
    },
    [modifierKeyManager],
  );

  const handleDragModeToggle = useCallback(
    (enabled: boolean) => {
      setDragModeEnabled(enabled);
      callbacks.onDragModeToggle(enabled);
    },
    [callbacks],
  );

  const handleKeyboardToggle = useCallback(() => {
    setKeyboardVisible(prev => !prev);
  }, []);

  const wrappedCallbacks: ToolbarCallbacks = {
    ...callbacks,
    onDragModeToggle: handleDragModeToggle,
    onKeyboardToggle: handleKeyboardToggle,
  };

  useEffect(() => {
    const updateLayout = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const isPortrait = windowHeight > windowWidth;
      setPosition(isPortrait ? "bottom" : "right");
      setIsLandscape(!isPortrait);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          ...(position === "bottom"
            ? { bottom: 0, left: 0, right: 0 }
            : position === "right"
              ? { top: 0, right: 0, bottom: 0 }
              : { top: 0, left: 0, right: 0 }),
        }}
      >
        <ResponsiveToolbar
          modifiers={modifiers}
          onModifierToggle={handleModifierToggle}
          callbacks={wrappedCallbacks}
          position={position}
          isLandscape={isLandscape}
          dragModeEnabled={dragModeEnabled}
        />
      </div>
      {keyboardVisible && (
        <div
          style={{
            position: "absolute",
            bottom: position === "bottom" ? "60px" : "0",
            left: 0,
            right: position === "right" ? "60px" : "0",
            zIndex: 999,
          }}
        >
          <VirtualKeyboard isVisible={keyboardVisible} callbacks={wrappedCallbacks} />
        </div>
      )}
    </div>
  );
};

export class ReactOverlayManager {
  private root: ReturnType<typeof createRoot> | null = null;
  private container: HTMLDivElement;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.root = createRoot(container);
  }

  render(props: OverlayContainerProps) {
    if (this.root) {
      this.root.render(<OverlayContainer {...props} />);
    }
  }

  destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
