import { ArrowTopRightOnSquareIcon, LightBulbIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useEffect, useRef } from "react";

interface SettingsPopupProps {
  game: string;
  optOutTutorial: boolean | undefined;
  setOptOutTutorial: (value: boolean) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export const SettingsPopup: React.FC<SettingsPopupProps> = ({
  optOutTutorial,
  setOptOutTutorial,
  onClose,
  anchorRef,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, anchorRef]);

  // Position the popup
  useEffect(() => {
    if (popupRef.current && anchorRef.current) {
      const buttonRect = anchorRef.current.getBoundingClientRect();
      const popup = popupRef.current;

      // Position below the button with some offset
      popup.style.position = "fixed";
      popup.style.top = `${buttonRect.bottom + 8}px`;

      // Align to the right edge of the button
      popup.style.right = `${window.innerWidth - buttonRect.right}px`;

      // Ensure popup doesn't go off-screen
      const popupRect = popup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth) {
        popup.style.right = "8px";
      }
      if (popupRect.bottom > window.innerHeight) {
        popup.style.top = `${buttonRect.top - popupRect.height - 8}px`;
      }
    }
  }, [anchorRef]);

  return (
    <div
      ref={popupRef}
      className="pw:fixed pw:z-50 pw:bg-base-200 pw:rounded-lg pw:shadow-xl pw:border pw:border-base-300 pw:p-4 pw:min-w-[280px] pw:max-w-[320px]"
    >
      {/* Header */}
      <div className="pw:flex pw:items-center pw:justify-between pw:mb-4 pw:pb-2 pw:border-b pw:border-base-300">
        <div className="pw:flex pw:items-center pw:gap-2">
          <img className="pw:w-5 pw:h-5 pw:rounded" src="/favicon.png" alt="" />
          <span className="pw:text-lg pw:font-['Poiret_One']">pob.cool</span>
        </div>
        <button type="button" onClick={onClose} className="pw:btn pw:btn-circle pw:btn-xs pw:btn-ghost">
          <XMarkIcon className="pw:size-4" />
        </button>
      </div>

      {/* Settings Content */}
      <div className="pw:space-y-4">
        {/* Preferences Section */}
        <div>
          <h3 className="pw:text-sm pw:font-semibold pw:text-base-content/70 pw:mb-2">Preferences</h3>
          <label className="pw:flex pw:items-center pw:gap-2 pw:cursor-pointer">
            <input
              type="checkbox"
              className="pw:toggle pw:toggle-sm"
              checked={!optOutTutorial}
              onChange={e => setOptOutTutorial(!e.target.checked)}
            />
            <span className="pw:flex pw:items-center pw:gap-1 pw:text-sm">
              <LightBulbIcon className="pw:size-4" />
              Show tutorial
            </span>
          </label>
        </div>

        {/* Version Info */}
        <div className="pw:pt-3 pw:border-t pw:border-base-300">
          <p className="pw:text-xs pw:text-base-content/60">
            Version {APP_VERSION}
            <a
              href={`https://github.com/atty303/pob-web/blob/v${APP_VERSION}/CHANGELOG.md`}
              target="_blank"
              rel="noreferrer"
              className="pw:link pw:inline-flex pw:items-center pw:ml-1"
            >
              (Changelog
              <ArrowTopRightOnSquareIcon className="pw:size-3 pw:ml-0.5" />)
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="pw:pt-3 pw:border-t pw:border-base-300 pw:text-xs pw:text-base-content/60 pw:space-y-1">
          <p>This product isn't affiliated with or endorsed by Grinding Gear Games.</p>
          <p>
            © 2025 Koji AGAWA (
            <a className="pw:link" href="https://x.com/atty303" target="_blank" rel="noreferrer">
              @atty303
            </a>
            )
          </p>
        </div>
      </div>
    </div>
  );
};
