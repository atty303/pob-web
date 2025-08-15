import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { KeyboardState } from "../keyboard";
import "./overlay.css";
import { Toolbar } from "./Toolbar";
import { VirtualKeyboard } from "./VirtualKeyboard";
import type { ToolbarCallbacks, ToolbarPosition } from "./types";

interface OverlayContainerProps {
  callbacks: ToolbarCallbacks;
  keyboardState: KeyboardState;
  panModeEnabled?: boolean;
  currentZoom?: number;
  currentCanvasSize?: { width: number; height: number };
  isFixedSize?: boolean;
}

export const OverlayContainer: React.FC<OverlayContainerProps> = ({
  callbacks,
  keyboardState,
  panModeEnabled: externalPanMode,
  currentZoom = 1.0,
  currentCanvasSize = { width: 1520, height: 800 },
  isFixedSize = false,
}) => {
  const [position, setPosition] = useState<ToolbarPosition>("bottom");
  const [isLandscape, setIsLandscape] = useState(false);
  const [panModeEnabled, setPanModeEnabled] = useState(externalPanMode ?? false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Update internal pan mode state when external prop changes
  useEffect(() => {
    if (externalPanMode !== undefined) {
      setPanModeEnabled(externalPanMode);
    }
  }, [externalPanMode]);

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
      className="driver-overlay"
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
        <Toolbar
          callbacks={wrappedCallbacks}
          position={position}
          isLandscape={isLandscape}
          panModeEnabled={panModeEnabled}
          keyboardVisible={keyboardVisible}
          currentZoom={currentZoom}
          currentCanvasSize={currentCanvasSize}
          isFixedSize={isFixedSize}
        />
      </div>
      {keyboardVisible && (
        <VirtualKeyboard isVisible={keyboardVisible} callbacks={wrappedCallbacks} keyboardState={keyboardState} />
      )}
    </div>
  );
};

export class ReactOverlayManager {
  private root: ReturnType<typeof createRoot> | null = null;
  private container: HTMLDivElement;
  private currentProps: OverlayContainerProps | null = null;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.root = createRoot(container);
  }

  render(props: OverlayContainerProps) {
    this.currentProps = props;
    if (this.root) {
      this.root.render(<OverlayContainer {...props} />);
    }
  }

  updateState(
    updates: Partial<
      Pick<OverlayContainerProps, "panModeEnabled" | "currentZoom" | "currentCanvasSize" | "isFixedSize">
    >,
  ) {
    if (this.currentProps && this.root) {
      const newProps = { ...this.currentProps, ...updates };
      this.currentProps = newProps;
      this.root.render(<OverlayContainer {...newProps} />);
    }
  }

  destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.currentProps = null;
  }
}
