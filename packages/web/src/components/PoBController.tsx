import type { Driver } from "pob-driver/driver";
import { useCallback, useEffect, useRef, useState } from "react";
import * as use from "react-use";
import { useNavigate } from "react-router";
import { loadPobbBuildViaProxy } from "../lib/pobb.ts";
import { loadWebSettings, saveWebSettings, type WebSettings } from "../lib/settings.ts";
import type { Games } from "../routes/_game.tsx";
import { HelpButton } from "./HelpButton.tsx";
import { HelpDialog } from "./HelpDialog.tsx";
import PoBWindow from "./PoBWindow.tsx";
import { SettingsButton } from "./SettingsButton.tsx";
import { SettingsDialog } from "./SettingsDialog.tsx";

const { useHash, useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
  const [title, setTitle] = useState<string>();
  useTitle(title ?? "pob.cool");
  const navigate = useNavigate();
  const [hash] = useHash();
  const [buildGameResolved, setBuildGameResolved] = useState(false);

  useEffect(() => {
    let active = true;
    const buildUrl = hash.startsWith("#build=")
      ? hash.slice("#build=".length)
      : hash.startsWith("#=")
      ? hash.slice(2)
      : undefined;
    if (!buildUrl) {
      setBuildGameResolved(true);
      return;
    }

    setBuildGameResolved(false);
    void loadPobbBuildViaProxy(buildUrl)
      .then((build) => {
        if (!active) return;
        if (build && build.game !== p.game) {
          navigate(`/${build.game}${hash}`, { replace: true });
          return;
        }
        setBuildGameResolved(true);
      })
      .catch(() => {
        if (active) setBuildGameResolved(true);
      });
    return () => {
      active = false;
    };
  }, [hash, navigate, p.game]);

  const container = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Driver | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

  const [settings, setSettings] = useState<WebSettings>();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  useEffect(() => {
    let storedSettings: WebSettings;
    try {
      storedSettings = loadWebSettings(window.localStorage);
    } catch {
      storedSettings = loadWebSettings({ getItem: () => null });
    }
    setSettings(storedSettings);
  }, []);

  const updateSettings = (next: WebSettings) => {
    try {
      saveWebSettings(window.localStorage, next);
    } catch {
      // The in-memory preference still applies when browser storage is unavailable.
    }
    setSettings(next);
  };

  const ToolbarComponents = useCallback(
    ({ position, isLandscape }: { position: "top" | "bottom" | "left" | "right"; isLandscape: boolean }) => (
      <>
        <SettingsButton
          position={position}
          isLandscape={isLandscape}
          onOpenSettings={() => settingsDialogRef.current?.showModal()}
        />
        <HelpButton position={position} isLandscape={isLandscape} onOpenHelp={() => setHelpDialogOpen(true)} />
      </>
    ),
    [],
  );

  return (
    <div
      ref={container}
      className="relative w-full h-full overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {settings && buildGameResolved && (
        <>
          <PoBWindow
            game={p.game}
            version={p.version}
            onFrame={() => {}}
            onTitleChange={setTitle}
            onLayerVisibilityCallbackReady={() => {}}
            onDriverReady={(driver) => {
              driverRef.current = driver;
              driver?.setPerformanceVisible(settings.performanceOverlay);
            }}
            toolbarComponent={ToolbarComponents}
          />

          <SettingsDialog
            ref={settingsDialogRef}
            performanceVisible={settings.performanceOverlay}
            onPerformanceToggle={() => {
              const performanceOverlay = !settings.performanceOverlay;
              updateSettings({ ...settings, performanceOverlay });
              driverRef.current?.setPerformanceVisible(performanceOverlay);
            }}
          />
        </>
      )}

      <HelpDialog isOpen={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </div>
  );
}
