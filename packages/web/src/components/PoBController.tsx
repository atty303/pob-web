import type { Driver } from "pob-driver/driver";
import { useCallback, useRef, useState } from "react";
import * as use from "react-use";
import type { Games } from "../routes/_game.tsx";
import { HelpButton } from "./HelpButton.tsx";
import { HelpDialog } from "./HelpDialog.tsx";
import PoBWindow from "./PoBWindow.tsx";
import { SettingsButton } from "./SettingsButton.tsx";
import { SettingsDialog } from "./SettingsDialog.tsx";

const { useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
  const [title, setTitle] = useState<string>();
  useTitle(title ?? "pob.cool");

  const container = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Driver | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

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
      <PoBWindow
        game={p.game}
        version={p.version}
        onFrame={() => {}}
        onTitleChange={setTitle}
        onLayerVisibilityCallbackReady={() => {}}
        onDriverReady={(driver) => {
          driverRef.current = driver;
        }}
        toolbarComponent={ToolbarComponents}
      />

      <SettingsDialog
        ref={settingsDialogRef}
        game={p.game}
        performanceVisible={performanceVisible}
        onPerformanceToggle={() => {
          const newValue = !performanceVisible;
          setPerformanceVisible(newValue);
          driverRef.current?.setPerformanceVisible(newValue);
        }}
      />

      <HelpDialog isOpen={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </div>
  );
}
