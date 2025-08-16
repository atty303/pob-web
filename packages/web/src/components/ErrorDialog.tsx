import { useState } from "react";

interface ErrorDialogProps {
  error: unknown;
  onReload: () => void;
  onClose: () => void;
}

export default function ErrorDialog({ error, onReload, onClose }: ErrorDialogProps) {
  const [copied, setCopied] = useState(false);

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";

  const fullErrorText = stack ? `${message}\n\nStack Trace:\n${stack}` : message;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullErrorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-full max-h-full w-[90vw] h-[90vh] flex flex-col">
        <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10" onClick={onClose}>
          ✕
        </button>

        <h3 className="font-bold text-lg text-error mb-4">Critical Error Occurred</h3>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div>
            <h4 className="font-semibold text-sm mb-2">Error Message:</h4>
            <div className="bg-base-200 rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap break-all font-mono text-error">{message}</pre>
            </div>
          </div>

          {stack && (
            <div className="flex-1 min-h-0 flex flex-col">
              <h4 className="font-semibold text-sm mb-2">Stack Trace:</h4>
              <div className="bg-base-200 rounded-lg p-4 flex-1 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono opacity-75">{stack}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="modal-action justify-between mt-4">
          <button type="button" className={`btn btn-sm ${copied ? "btn-success" : "btn-neutral"}`} onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Error"}
          </button>

          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={onReload}>
              Reload Page
            </button>
          </div>
        </div>
      </div>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is for mouse only */}
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </dialog>
  );
}
