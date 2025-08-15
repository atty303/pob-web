import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ResponsiveToolbar } from "./ResponsiveToolbar";
import type { ModifierKeys, ToolbarCallbacks, ToolbarPosition } from "./types";

interface OverlayContainerProps {
  modifierKeyManager: {
    modifiers: ModifierKeys;
    toggleModifier: (key: keyof ModifierKeys) => void;
  };
  callbacks: ToolbarCallbacks;
  toolbarContainer: HTMLDivElement;
}

export const OverlayContainer: React.FC<OverlayContainerProps> = ({
  modifierKeyManager,
  callbacks,
  toolbarContainer,
}) => {
  const [modifiers, setModifiers] = useState<ModifierKeys>(modifierKeyManager.modifiers);
  const [position, setPosition] = useState<ToolbarPosition>("bottom");
  const [isLandscape, setIsLandscape] = useState(false);
  const [dragModeEnabled, setDragModeEnabled] = useState(false);

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

  const wrappedCallbacks: ToolbarCallbacks = {
    ...callbacks,
    onDragModeToggle: handleDragModeToggle,
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
    <ResponsiveToolbar
      modifiers={modifiers}
      onModifierToggle={handleModifierToggle}
      callbacks={wrappedCallbacks}
      position={position}
      isLandscape={isLandscape}
      dragModeEnabled={dragModeEnabled}
    />
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
