export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ToolbarCallbacks {
  onChar: (char: string, doubleClick: number) => void;
  onKeyDown: (key: string, doubleClick: number) => void;
  onKeyUp: (key: string, doubleClick: number) => void;
  onZoomReset: () => void;
  onZoomChange: (zoom: number) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
  onFixedSizeToggle: (isFixed: boolean) => void;
  onLayoutChange: () => void;
  onFullscreenToggle: () => void;
  onPanModeToggle: (enabled: boolean) => void;
  onKeyboardToggle: () => void;
}

export type ToolbarPosition = "top" | "bottom" | "left" | "right";
