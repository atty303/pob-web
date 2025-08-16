import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import type React from "react";

interface SettingsButtonProps {
  position: "top" | "bottom" | "left" | "right";
  isLandscape: boolean;
  onOpenSettings: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ onOpenSettings }) => {
  return (
    <button type="button" onClick={onOpenSettings} className="pw:btn pw:btn-square pw:btn-ghost" title="Settings">
      <Cog6ToothIcon className="pw:size-6" />
    </button>
  );
};
