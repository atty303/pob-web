export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ToolbarCallbacks {
  onZoomReset: () => void;
  onZoomChange: (zoom: number) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
  onFixedSizeToggle: (isFixed: boolean) => void;
  onLayoutChange: () => void;
  onFullscreenToggle: () => void;
  onPanModeToggle: (enabled: boolean) => void;
  onKeyboardToggle: () => void;
  onPerformanceToggle: () => void;
}

export type ToolbarPosition = "top" | "bottom" | "left" | "right";
