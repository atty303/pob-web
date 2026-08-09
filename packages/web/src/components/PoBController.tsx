import * as Sentry from "@sentry/react";
import type { Driver } from "pob-driver/src/js/driver";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
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
  const [searchParams] = useSearchParams();
  const [sentryTestStatus, setSentryTestStatus] = useState<string>();
  const [sentryTestStack, setSentryTestStack] = useState<string>();
  const [sentryTestPending, setSentryTestPending] = useState(false);
  const [driverReady, setDriverReady] = useState(false);

  const captureSentryTestIssue = async (kind: "javascript" | "wasm") => {
    setSentryTestPending(true);
    setSentryTestStatus(`Triggering ${kind} issue…`);
    setSentryTestStack(undefined);
    try {
      if (kind === "wasm") {
        if (!driverRef.current) throw new Error("Path of Building driver is not ready");
        await driverRef.current.triggerSentryTestCrash();
      } else {
        throw new Error("Intentional JavaScript Sentry test issue");
      }
    } catch (error) {
      setSentryTestStack(error instanceof Error ? error.stack : String(error));
      const eventId = Sentry.captureException(error, { tags: { intentional_test: "true", runtime: kind } });
      const sent = await Sentry.flush(2_000);
      setSentryTestStatus(sent ? `Recorded ${kind} issue: ${eventId}` : `Timed out sending ${kind} issue: ${eventId}`);
    } finally {
      setSentryTestPending(false);
    }
  };

  const ToolbarComponents = ({
    position,
    isLandscape,
  }: {
    position: "top" | "bottom" | "left" | "right";
    isLandscape: boolean;
  }) => {
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
          setDriverReady(driver !== null);
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

      {searchParams.has("sentry-test") && (
        <aside className="absolute top-4 left-1/2 z-[2000] -translate-x-1/2 rounded-box bg-base-200 p-4 shadow-xl">
          <p className="mb-3 font-semibold">Sentry test issue</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={sentryTestPending}
              onClick={() => captureSentryTestIssue("javascript")}
            >
              Record JavaScript issue
            </button>
            <button
              type="button"
              className="btn btn-sm btn-error"
              disabled={!driverReady || sentryTestPending}
              onClick={() => captureSentryTestIssue("wasm")}
            >
              Record WASM issue
            </button>
          </div>
          {sentryTestStatus && <p className="mt-3 text-sm">{sentryTestStatus}</p>}
          {sentryTestStack && (
            <details className="mt-3 max-w-xl text-sm">
              <summary>Captured stack</summary>
              <pre data-testid="sentry-test-stack" className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
                {sentryTestStack}
              </pre>
            </details>
          )}
        </aside>
      )}
    </div>
  );
}
