import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { KeyboardState } from "../keyboard";
import { ResponsiveToolbar } from "./ResponsiveToolbar";
import { VirtualKeyboard } from "./VirtualKeyboard";
import type { ToolbarCallbacks, ToolbarPosition } from "./types";

interface OverlayContainerProps {
  callbacks: ToolbarCallbacks;
  keyboardState: KeyboardState;
}

export const OverlayContainer: React.FC<OverlayContainerProps> = ({ callbacks, keyboardState }) => {
  const [position, setPosition] = useState<ToolbarPosition>("bottom");
  const [isLandscape, setIsLandscape] = useState(false);
  const [panModeEnabled, setPanModeEnabled] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const handlePanModeToggle = useCallback(
    (enabled: boolean) => {
      setPanModeEnabled(enabled);
      callbacks.onPanModeToggle(enabled);
    },
    [callbacks],
  );

  const handleKeyboardToggle = useCallback(() => {
    setKeyboardVisible(prev => !prev);
  }, []);

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  const wrappedCallbacks: ToolbarCallbacks = {
    ...callbacks,
    onPanModeToggle: handlePanModeToggle,
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
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          pointerEvents: "auto",
          ...(position === "bottom"
            ? { bottom: 0, left: 0, right: 0 }
            : position === "right"
              ? { top: 0, right: 0, bottom: 0 }
              : { top: 0, left: 0, right: 0 }),
        }}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onMouseMove={stopPropagation}
        onClick={stopPropagation}
        onTouchStart={stopPropagation}
        onTouchMove={stopPropagation}
        onTouchEnd={stopPropagation}
        onKeyDown={stopPropagation}
        onKeyUp={stopPropagation}
        onWheel={stopPropagation}
      >
        <ResponsiveToolbar
          callbacks={wrappedCallbacks}
          position={position}
          isLandscape={isLandscape}
          panModeEnabled={panModeEnabled}
          keyboardVisible={keyboardVisible}
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
            pointerEvents: "auto",
          }}
          onMouseDown={stopPropagation}
          onMouseUp={stopPropagation}
          onMouseMove={stopPropagation}
          onClick={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
          onTouchEnd={stopPropagation}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          onWheel={stopPropagation}
        >
          <VirtualKeyboard isVisible={keyboardVisible} callbacks={wrappedCallbacks} keyboardState={keyboardState} />
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
