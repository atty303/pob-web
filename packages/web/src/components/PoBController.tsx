import type { Driver } from "pob-driver/src/js/driver";
import { useEffect, useRef, useState } from "react";
import * as use from "react-use";
import type { Games } from "../routes/_game";
import { HelpButton } from "./HelpButton";
import { HelpDialog } from "./HelpDialog";
import PoBWindow from "./PoBWindow";
import { SettingsButton } from "./SettingsButton";
import { SettingsDialog } from "./SettingsDialog";

const { useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
  const [title, setTitle] = useState<string>();
  useTitle(title ?? "pob.cool");

  const container = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Driver | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const ToolbarComponents = ({
    position,
    isLandscape,
  }: { position: "top" | "bottom" | "left" | "right"; isLandscape: boolean }) => {
    return (
      <>
        <SettingsButton
          position={position}
          isLandscape={isLandscape}
          onOpenSettings={() => settingsDialogRef.current?.showModal()}
        />
        <HelpButton position={position} isLandscape={isLandscape} onOpenHelp={() => setHelpDialogOpen(true)} />
      </>
    );
  };

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
        onDriverReady={driver => {
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
