import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useRef, useState } from "react";
import { SettingsPopup } from "./SettingsPopup";

interface SettingsButtonProps {
  position: "top" | "bottom" | "left" | "right";
  isLandscape: boolean;
  game: string;
  optOutTutorial: boolean | undefined;
  setOptOutTutorial: (value: boolean) => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ game, optOutTutorial, setOptOutTutorial }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="pw:btn pw:btn-square pw:btn-ghost"
        title="Settings"
      >
        <Cog6ToothIcon className="pw:size-6" />
      </button>

      {isOpen && (
        <SettingsPopup
          game={game}
          optOutTutorial={optOutTutorial}
          setOptOutTutorial={setOptOutTutorial}
          onClose={() => setIsOpen(false)}
          anchorRef={buttonRef}
        />
      )}
    </>
  );
};
