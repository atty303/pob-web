import { useAuth0 } from "@auth0/auth0-react";
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useState } from "react";
import { useRecoilState } from "recoil";
import { isFullscreenState } from "./state.ts";

function HelpDialog(props: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog className="modal modal-open" open={props.isOpen} onClose={props.onClose}>
      <div className="modal-box max-w-5xl">
        <DialogPanel>
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              type="submit"
              onClick={props.onClose}
            >
              ✕
            </button>
          </form>

          <DialogTitle className="text-lg font-bold">Help</DialogTitle>

          <article className="prose max-w-none">
            <p>This is browser version of Path of Building.</p>
            <h3>Limitations</h3>
            <ul>
              <li>
                <p>
                  For security reasons, network requests containing the <code>POESESSID</code> cookie will be
                  unconditionally rejected.
                </p>
                <p>
                  <strong className="text-error">
                    Do not enter <code>POESESSID</code> in the PoB of this site.
                  </strong>
                </p>
              </li>
              <li>
                Network access is through our CORS proxy, so all users have the same source IP. This will likely cause
                rate limiting.
              </li>
            </ul>
            <h3>Features</h3>
            <ul>
              <li>Saved builds are stored in the browser's local storage.</li>
              <li>
                The <code>Cloud</code> folder appears when you are logged into the site. Builds saved there are stored
                in the cloud and can be accessed from anywhere.
              </li>
              <li>
                You can load a build by specifying a hash in the URL. eg.{" "}
                <code>https://pob.cool/#build=https://pobb.in/WwTAYwulVav6</code>
              </li>
            </ul>
          </article>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function SettingDialog(props: {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onVersionChange: (version: string) => void;
}) {
  return (
    <Dialog className="modal modal-open" open={props.isOpen} onClose={props.onClose}>
      <div className="modal-box">
        <DialogPanel>
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              type="submit"
              onClick={props.onClose}
            >
              ✕
            </button>
          </form>

          <DialogTitle className="text-lg font-bold">Settings</DialogTitle>

          <label className="form-control w-full max-w-xs">
            <div className="label font-bold">
              <span className="label-text">PoB version</span>
            </div>
            <select
              className="select select-bordered"
              value={props.version}
              onChange={(e) => props.onVersionChange(e.target.value)}
            >
              <option value="v2.43.0">2.43.0</option>
              <option value="v2.42.0">2.42.0</option>
              <option value="v2.41.1">2.41.1</option>
            </select>
          </label>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function Auth() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <span className="loading loading-spinner loading-md" />;
  }
  if (isAuthenticated) {
    return (
      <>
        <Menu>
          <MenuButton className="btn btn-ghost btn-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <title>user-circle</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>

            {user?.name}
          </MenuButton>
          <MenuItems className="menu bg-base-200 w-56 rounded-box" anchor="bottom end">
            <MenuItem>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <title>Logout</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                  />
                </svg>
                Logout
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </>
    );
  }
  return (
    <>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => loginWithRedirect()}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <title>Login</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
          />
        </svg>
        Login
      </button>
    </>
  );
}

export default function Header(props: {
  version: string;
  onVersionChange: (version: string) => void;
  title: string;
}) {
  const [settingDialogOpen, setSettingDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [_, setFullscreen] = useRecoilState(isFullscreenState);

  return (
    <>
      <div className="navbar bg-neutral text-neutral-content">
        <div className="flex-1 gap-2">
          <img className="w-8 h-8 rounded-box" src="/favicon.png" alt="" />
          <span className="text-xl font-bold font-['Poiret_One'] pr-4 border-r border-r-neutral-content/50">
            pob.cool
          </span>
          <span className="text-lg font-bold ml-2">{props.title}</span>
        </div>
        <div className="flex-none mr-4 gap-2">
          <button className="btn btn-ghost btn-circle btn-sm" type="button" onClick={() => setFullscreen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <title>Fullscreen</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          </button>

          <button className="btn btn-ghost btn-circle btn-sm" type="button" onClick={() => setSettingDialogOpen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <title>cog</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <SettingDialog
            isOpen={settingDialogOpen}
            onClose={() => setSettingDialogOpen(false)}
            version={props.version}
            onVersionChange={props.onVersionChange}
          />

          <button className="btn btn-ghost btn-circle btn-sm" type="button" onClick={() => setHelpDialogOpen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <title>question</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
              />
            </svg>
          </button>
          <HelpDialog isOpen={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />

          <Auth />
        </div>
      </div>
    </>
  );
}
