import { useAuth0 } from "@auth0/auth0-react";
import { ArrowTopRightOnSquareIcon, LightBulbIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import * as use from "react-use";
import type { Games } from "../routes/_game";
import { AuthButton } from "./AuthButton";
import { HomeButton } from "./HomeButton";
import { MenuButton } from "./MenuButton";
import PoBWindow from "./PoBWindow";

const { useTimeoutFn, useLocalStorage, useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  const [title, setTitle] = useState<string>();
  useTitle(title ?? "pob.cool");

  const container = useRef<HTMLDivElement>(null);

  const [optOutTutorial, setOptOutTutorial] = useLocalStorage("optOutTutorial", false);
  const [tutorial, setTutorial] = useState(true);
  useTimeoutFn(() => {
    setTutorial(false);
    setNotFirstVisit(true);
  }, 3000);

  const [notFirstVisit, setNotFirstVisit] = useLocalStorage("notFirstVisit", false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    if (!notFirstVisit) {
      setDrawer(true);
    }
  }, [notFirstVisit]);

  // Create toolbar components for driver toolbar
  const ToolbarComponents = ({
    position,
    isLandscape,
  }: { position: "top" | "bottom" | "left" | "right"; isLandscape: boolean }) => {
    return (
      <>
        <HomeButton position={position} isLandscape={isLandscape} />
        <AuthButton
          position={position}
          isLandscape={isLandscape}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          userName={user?.name}
          onLogin={() => loginWithRedirect()}
          onLogout={() => logout()}
        />
        <MenuButton position={position} isLandscape={isLandscape} onToggle={() => setDrawer(true)} />
      </>
    );
  };

  return (
    <div ref={container} className="drawer">
      <input
        id="drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={drawer}
        onChange={e => setDrawer(e.target.checked)}
      />
      <div className="drawer-content">
        <div className="relative l-lvw h-lvh">
          <div className="absolute top-0 left-0 right-0 bottom-0">
            <PoBWindow
              game={p.game}
              version={p.version}
              onFrame={() => {}}
              onTitleChange={setTitle}
              onLayerVisibilityCallbackReady={() => {}}
              toolbarComponent={ToolbarComponents}
            />
          </div>
        </div>
      </div>
      <Sidebar
        game={p.game}
        isHead={p.isHead}
        setDrawer={setDrawer}
        optOutTutorial={optOutTutorial}
        setOptOutTutorial={setOptOutTutorial}
      />
    </div>
  );
}

function Sidebar(p: {
  game: keyof Games;
  isHead: boolean;
  setDrawer: (value: boolean) => void;
  optOutTutorial: boolean | undefined;
  setOptOutTutorial: (value: boolean) => void;
}) {
  return (
    <div className="drawer-side">
      <label htmlFor="drawer" aria-label="close sidebar" className="drawer-overlay" />
      <div className="min-h-full h-dvh bg-base-200 text-base-content w-80 grid grid-cols-1 grid-rows-[auto_1fr_auto_auto]">
        <header className="flex items-center gap-2 p-4">
          <img className="w-6 h-6 rounded-box" src="/favicon.png" alt="" />
          <span className="text-xl font-['Poiret_One'] ">pob.cool</span>
          <span className="flex-1 text-right">
            <button className="btn btn-circle btn-xs btn-ghost" type="button" onClick={() => p.setDrawer(false)}>
              <XMarkIcon className="size-6" />
            </button>
          </span>
        </header>
        <ul className="menu w-full">
          <li className="menu-title">Preferences</li>
          <li>
            <label htmlFor="optOutTutorial" className="flex">
              <span className="flex-1 flex items-center gap-2">
                <LightBulbIcon className="size-4" />
                Show tutorial
              </span>
              <input
                id="optOutTutorial"
                type="checkbox"
                className="toggle"
                checked={!p.optOutTutorial}
                onChange={e => p.setOptOutTutorial(!e.target.checked)}
              />
            </label>
          </li>
        </ul>
        <footer className="footer gap-2 p-4 border-t border-base-content/50 text-base-content/50">
          <span className="block">
            Web site version is {APP_VERSION}
            <a
              href={`https://github.com/atty303/pob-web/blob/v${APP_VERSION}/CHANGELOG.md`}
              target="_blank"
              rel="noreferrer"
              className="link inline-flex items-center ml-2"
            >
              (ChangeLog
              <ArrowTopRightOnSquareIcon className="size-4" />)
            </a>
          </span>
          <p>This product isn't affiliated with or endorsed by Grinding Gear Games in any way.</p>
          <aside>
            <p>
              © 2025 Koji AGAWA (
              <a className="link" href="https://x.com/atty303" target="_blank" rel="noreferrer">
                @atty303
              </a>
              )
            </p>
          </aside>
        </footer>
      </div>
    </div>
  );
}
