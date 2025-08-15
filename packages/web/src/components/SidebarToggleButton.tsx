import { Bars3Icon } from "@heroicons/react/24/solid";
import type React from "react";

interface SidebarToggleButtonProps {
  position: "top" | "bottom" | "left" | "right";
  isLandscape: boolean;
  onToggle: () => void;
}

export const SidebarToggleButton: React.FC<SidebarToggleButtonProps> = ({ onToggle }) => {
  return (
    <button type="button" onClick={onToggle} className="pw:btn pw:btn-square pw:btn-ghost" title="Toggle Menu">
      <Bars3Icon className="pw:size-6" />
    </button>
  );
};
