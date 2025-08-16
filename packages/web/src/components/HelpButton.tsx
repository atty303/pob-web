import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid";
import type React from "react";

interface HelpButtonProps {
  position: "top" | "bottom" | "left" | "right";
  isLandscape: boolean;
  onOpenHelp: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onOpenHelp }) => {
  return (
    <button type="button" onClick={onOpenHelp} className="pw:btn pw:btn-square pw:btn-ghost" title="Help">
      <QuestionMarkCircleIcon className="pw:size-6" />
    </button>
  );
};
