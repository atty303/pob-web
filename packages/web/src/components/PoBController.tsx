import { useAuth0 } from "@auth0/auth0-react";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  Bars3Icon,
  HomeIcon,
  LightBulbIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import * as use from "react-use";
import type { Games } from "../routes/_game";
import PoBWindow from "./PoBWindow";

const { useTimeoutFn, useLocalStorage, useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
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
            />
          </div>
          <div className="absolute top-2 right-2">
            <span
              className="not-data-tutorial:invisible data-tutorial:inline-block data-tutorial:animate-bounce"
              data-tutorial={(tutorial && !optOutTutorial) || null}
            >
              <div
                className="tooltip tooltip-open tooltip-left tooltip-info"
                data-tip="Use this button to open the menu"
              />
            </span>
            <label className="btn btn-circle btn-primary opacity-75" htmlFor="drawer">
              <Bars3Icon className="size-6" />
            </label>
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
          <ul className="menu w-full">
            <li className="pointer-events-none bg-base-300">
              <Auth tutorial={!p.optOutTutorial} />
            </li>
          </ul>
          <li className="menu-title mt-2">Navigation</li>
          <li>
            <Link to="/">
              <HomeIcon className="size-4" /> Return to home
            </Link>
          </li>
          <li className={p.isHead ? "menu-disabled" : undefined}>
            <Link to={`/${p.game}/`}>
              <ArrowUpIcon className="size-4" /> Change to latest version
            </Link>
          </li>
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

function Auth(p: { tutorial: boolean }) {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="place-content-center p-2">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  } else if (isAuthenticated) {
    return (
      <div>
        <UserCircleIcon className="size-6" />
        {user?.name}
        <button className="btn btn-primary pointer-events-auto" type="button" onClick={() => logout()}>
          <ArrowRightStartOnRectangleIcon className="size-4" />
          Logout
        </button>
      </div>
    );
  } else {
    return (
      <div
        className={`tooltip tooltip-right tooltip-info ${p.tutorial && "tooltip-open"}`}
        data-tip="You can save your builds to the cloud by logging in."
      >
        <button
          className="btn btn-primary btn-block pointer-events-auto"
          type="button"
          onClick={() => loginWithRedirect()}
        >
          <ArrowRightEndOnRectangleIcon className="size-4" />
          Login
        </button>
      </div>
    );
  }
}
