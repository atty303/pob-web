import type { UIState } from "../event";

export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ToolbarCallbacks {
  onChar: (char: string, doubleClick: number, uiState: UIState) => void;
  onKeyDown: (key: string, doubleClick: number, uiState: UIState) => void;
  onKeyUp: (key: string, doubleClick: number, uiState: UIState) => void;
  onZoomReset: () => void;
  onLayoutChange: () => void;
  onFullscreenToggle: () => void;
  onPanModeToggle: (enabled: boolean) => void;
  onKeyboardToggle: () => void;
}

export type ToolbarPosition = "top" | "bottom" | "left" | "right";

export type { UIState };
