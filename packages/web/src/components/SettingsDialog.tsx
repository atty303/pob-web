import { ArrowTopRightOnSquareIcon, ChartBarIcon, LightBulbIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { forwardRef } from "react";

interface SettingsDialogProps {
  game: string;
  optOutTutorial: boolean | undefined;
  setOptOutTutorial: (value: boolean) => void;
  performanceVisible: boolean;
  onPerformanceToggle: () => void;
}

export const SettingsDialog = forwardRef<HTMLDialogElement, SettingsDialogProps>(
  ({ optOutTutorial, setOptOutTutorial, performanceVisible, onPerformanceToggle }, ref) => {
    const closeDialog = () => {
      if (ref && typeof ref !== "function" && ref.current) {
        ref.current.close();
      }
    };

    return (
      <dialog ref={ref} className="pw:modal">
        <div className="pw:modal-box pw:w-80 pw:max-w-sm">
          {/* Header */}
          <div className="pw:flex pw:items-center pw:justify-between pw:mb-4 pw:pb-2 pw:border-b pw:border-base-300">
            <div className="pw:flex pw:items-center pw:gap-2">
              <img className="pw:w-5 pw:h-5 pw:rounded" src="/favicon.png" alt="" />
              <span className="pw:text-lg pw:font-['Poiret_One']">pob.cool</span>
            </div>
            <button type="button" onClick={closeDialog} className="pw:btn pw:btn-circle pw:btn-xs pw:btn-ghost">
              <XMarkIcon className="pw:size-4" />
            </button>
          </div>

          {/* Settings Content */}
          <div className="pw:space-y-4">
            {/* Preferences Section */}
            <div>
              <h3 className="pw:text-sm pw:font-semibold pw:text-base-content/70 pw:mb-2">Preferences</h3>
              <div className="pw:space-y-2">
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

                <label className="pw:flex pw:items-center pw:gap-2 pw:cursor-pointer">
                  <input
                    type="checkbox"
                    className="pw:toggle pw:toggle-sm"
                    checked={performanceVisible}
                    onChange={() => onPerformanceToggle()}
                  />
                  <span className="pw:flex pw:items-center pw:gap-1 pw:text-sm">
                    <ChartBarIcon className="pw:size-4" />
                    Performance overlay
                  </span>
                </label>
              </div>
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

        {/* Modal backdrop - clicking closes the dialog */}
        <form method="dialog" className="pw:modal-backdrop">
          <button type="button">close</button>
        </form>
      </dialog>
    );
  },
);
