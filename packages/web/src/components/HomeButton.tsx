import { HomeIcon } from "@heroicons/react/24/solid";
import type React from "react";

interface HomeButtonProps {
  position: "top" | "bottom" | "left" | "right";
  isLandscape: boolean;
}

export const HomeButton: React.FC<HomeButtonProps> = () => {
  return (
    <a href="/" className="pw:btn pw:btn-square pw:btn-ghost" title="Return to Home">
      <HomeIcon className="pw:size-6" />
    </a>
  );
};
