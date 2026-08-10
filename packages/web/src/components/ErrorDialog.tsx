import { gameData } from "pob-game/src";
import { useState } from "react";
import { type DiagnosticReport, describeError, formatDiagnosticReport } from "../lib/error-report.ts";

interface ErrorDialogProps {
  report: DiagnosticReport;
  onReload: () => void;
  onClose: () => void;
}

export default function ErrorDialog({ report, onReload, onClose }: ErrorDialogProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmedWebOnly, setConfirmedWebOnly] = useState(false);

  const { name, message, stack } = describeError(report.error);
  const environmentError = report.environmentCategory !== undefined;
  const upstream = gameData[report.context.game].repository;
  const upstreamReleaseUrl = `https://github.com/${upstream.owner}/${upstream.name}/releases/tag/${report.context.pobVersion}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatDiagnosticReport(report));
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      setCopyStatus("failed");
      console.error("Failed to copy:", err);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-full max-h-full w-[90vw] h-[90vh] flex flex-col">
        <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10" onClick={onClose}>
          ✕
        </button>

        <h3 className="font-bold text-lg text-error mb-2">
          {environmentError ? "Path of Building couldn't start" : "Path of Building encountered an error"}
        </h3>

        <p className="text-sm mb-4">
          Diagnostic information about this error was collected automatically. Reload the page to try again.
        </p>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          {!environmentError && (
            <section className="rounded-lg border border-base-300 p-4">
              <h4 className="font-semibold text-sm mb-2">Before reporting this to pob.cool</h4>
              <p className="text-sm mb-3">
                Try the same build with the original {gameData[report.context.game].name} application at version{" "}
                <a className="link" href={upstreamReleaseUrl} target="_blank" rel="noreferrer">
                  {report.context.pobVersion}
                </a>
                . If it also happens there, it is not specific to pob.cool and should not be reported here.
              </p>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5"
                  checked={confirmedWebOnly}
                  onChange={event => setConfirmedWebOnly(event.target.checked)}
                />
                <span>I confirmed this issue does not occur in the original application.</span>
              </label>
              <div className="mt-3">
                {confirmedWebOnly ? (
                  <a
                    className="btn btn-sm btn-outline"
                    href="https://github.com/atty303/pob-web/issues/new"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Report a pob.cool issue
                  </a>
                ) : (
                  <button type="button" className="btn btn-sm btn-outline" disabled>
                    Report a pob.cool issue
                  </button>
                )}
              </div>
            </section>
          )}

          <details className="collapse collapse-arrow border border-base-300 rounded-lg">
            <summary className="collapse-title font-semibold text-sm">Technical details</summary>
            <div className="collapse-content flex flex-col gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Error</h4>
                <div className="bg-base-200 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap break-all font-mono text-error">{`${name}: ${message}`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Environment</h4>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt>App</dt>
                  <dd>{report.context.appVersion}</dd>
                  <dt>Game</dt>
                  <dd>{report.context.game}</dd>
                  <dt>PoB</dt>
                  <dd>{report.context.pobVersion}</dd>
                  <dt>Phase</dt>
                  <dd>{report.context.phase}</dd>
                  <dt>URL</dt>
                  <dd className="break-all">{report.context.url}</dd>
                  <dt>User agent</dt>
                  <dd className="break-all">{report.context.userAgent}</dd>
                </dl>
              </div>

              {stack && (
                <div className="min-h-0 flex flex-col">
                  <h4 className="font-semibold text-sm mb-2">Stack Trace</h4>
                  <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono opacity-75">{stack}</pre>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  className={`btn btn-sm ${copyStatus === "copied" ? "btn-success" : "btn-neutral"}`}
                  onClick={handleCopy}
                >
                  {copyStatus === "copied"
                    ? "Copied"
                    : copyStatus === "failed"
                      ? "Copy failed — try again"
                      : "Copy Diagnostics"}
                </button>
              </div>
            </div>
          </details>
        </div>

        <div className="modal-action mt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={onReload}>
            Reload Page
          </button>
        </div>
      </div>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is for mouse only */}
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </dialog>
  );
}
