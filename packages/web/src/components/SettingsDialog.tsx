import { useAuth0 } from "@auth0/auth0-react";
import { ArrowTopRightOnSquareIcon, ChartBarIcon, HomeIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { forwardRef } from "react";

interface SettingsDialogProps {
  game: string;
  performanceVisible: boolean;
  onPerformanceToggle: () => void;
}

export const SettingsDialog = forwardRef<HTMLDialogElement, SettingsDialogProps>(
  ({ performanceVisible, onPerformanceToggle }, ref) => {
    const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();
    const closeDialog = () => {
      if (ref && typeof ref !== "function" && ref.current) {
        ref.current.close();
      }
    };

    return (
      <dialog ref={ref} className="pw:modal">
        <div className="pw:modal-box pw:max-w-2xl">
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
          <div className="pw:space-y-5">
            {/* Account Section */}
            <div className="pw:space-y-3">
              <h3 className="pw:text-sm pw:font-semibold pw:text-base-content/80 pw:mb-3">Account</h3>

              {isLoading ? (
                <div className="pw:flex pw:items-center pw:gap-3 pw:p-3 pw:rounded-lg pw:bg-base-100">
                  <div className="pw:loading pw:loading-spinner pw:loading-sm" />
                  <span className="pw:text-sm pw:text-base-content/70">Loading account...</span>
                </div>
              ) : isAuthenticated ? (
                <div className="pw:flex pw:items-center pw:gap-3 pw:p-3 pw:rounded-xl pw:bg-base-100 pw:border-2 pw:border-success">
                  <div className="pw:w-8 pw:h-8 pw:rounded-full pw:bg-success pw:flex pw:items-center pw:justify-center">
                    <UserIcon className="pw:size-4 pw:text-success-content" />
                  </div>
                  <div className="pw:flex-1 pw:min-w-0">
                    <div className="pw:text-sm pw:font-semibold pw:text-base-content">Signed in</div>
                    {user?.name && <div className="pw:text-xs pw:text-base-content/70 pw:truncate">{user.name}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      closeDialog();
                    }}
                    className="pw:btn pw:btn-ghost pw:btn-xs pw:text-xs"
                    title="Sign out"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="pw:flex pw:items-center pw:gap-3 pw:p-3 pw:rounded-xl pw:bg-base-200/50 pw:border-2 pw:border-base-300/50 pw:border-dashed">
                  <div className="pw:w-8 pw:h-8 pw:rounded-full pw:bg-base-300 pw:flex pw:items-center pw:justify-center">
                    <UserIcon className="pw:size-4 pw:text-base-content/60" />
                  </div>
                  <div className="pw:flex-1 pw:min-w-0">
                    <div className="pw:text-sm pw:font-semibold pw:text-base-content">Not signed in</div>
                    <div className="pw:text-xs pw:text-base-content/70">Sync builds across devices</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      loginWithRedirect();
                      closeDialog();
                    }}
                    className="pw:btn pw:btn-primary pw:btn-xs pw:text-xs"
                    title="Sign in to sync your builds"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Section */}
            <div className="pw:space-y-3">
              <h3 className="pw:text-sm pw:font-semibold pw:text-base-content/80 pw:mb-3">Navigation</h3>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                  closeDialog();
                }}
                className="pw:btn pw:btn-ghost pw:btn-sm pw:w-full pw:justify-start"
              >
                <HomeIcon className="pw:size-4" />
                Return to Home
              </button>
            </div>

            {/* Preferences Section */}
            <div className="pw:space-y-3">
              <h3 className="pw:text-sm pw:font-semibold pw:text-base-content/80 pw:mb-3">Preferences</h3>
              <div className="pw:space-y-3">
                <label className="pw:flex pw:items-center pw:gap-3 pw:cursor-pointer pw:p-3 pw:rounded-lg pw:bg-base-100 pw:border pw:border-base-300 hover:pw:bg-base-200 pw:transition-colors">
                  <input
                    type="checkbox"
                    className="pw:toggle pw:toggle-sm pw:toggle-primary"
                    checked={performanceVisible}
                    onChange={() => onPerformanceToggle()}
                  />
                  <div className="pw:flex pw:items-center pw:gap-2 pw:flex-1">
                    <ChartBarIcon className="pw:size-4 pw:text-primary" />
                    <div>
                      <div className="pw:text-sm pw:font-medium">Performance overlay</div>
                      <div className="pw:text-xs pw:text-base-content/60">Show frame time and render statistics</div>
                    </div>
                  </div>
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
