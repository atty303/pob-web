import { XMarkIcon } from "@heroicons/react/24/solid";
import type React from "react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="pw:modal pw:modal-open">
      <div className="pw:modal-box pw:max-w-4xl pw:max-h-[90vh] pw:overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="pw:btn pw:btn-sm pw:btn-circle pw:btn-ghost pw:absolute pw:right-2 pw:top-2"
        >
          <XMarkIcon className="pw:size-5" />
        </button>

        <h2 className="pw:font-bold pw:text-lg pw:mb-4">Controls & Navigation</h2>

        <div className="pw:space-y-6">
          <div>
            <h3 className="pw:font-semibold pw:text-base pw:mb-3 pw:text-primary">Touch Controls</h3>
            <div className="pw:overflow-x-auto">
              <table className="pw:table pw:table-zebra pw:table-sm">
                <thead>
                  <tr>
                    <th className="pw:w-32">Operation</th>
                    <th>Pointer Mode OFF</th>
                    <th>Pointer Mode ON</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pw:font-medium">Left Click</td>
                    <td>Single tap</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td className="pw:font-medium">Right Click</td>
                    <td>Long press (300ms)</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td className="pw:font-medium">Pointer Move</td>
                    <td>-</td>
                    <td>Single finger movement</td>
                  </tr>
                  <tr>
                    <td className="pw:font-medium">Drag</td>
                    <td>Single finger movement</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td className="pw:font-medium">Wheel</td>
                    <td>Two finger vertical drag</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td className="pw:font-medium">Zoom</td>
                    <td>Two finger pinch</td>
                    <td>Two finger pinch</td>
                  </tr>
                  <tr>
                    <td className="pw:font-medium">Pan Canvas</td>
                    <td>Three finger drag</td>
                    <td>Three finger drag</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="pw:text-xs pw:opacity-60 pw:mt-2">
              Desktop controls follow standard mouse/keyboard conventions. Pointer tool change left click behavior to
              pan canvas on desktop.
            </p>
          </div>

          <div>
            <h3 className="pw:font-semibold pw:text-base pw:mb-3 pw:text-primary">Tips</h3>
            <ul className="pw:list-disc pw:list-inside pw:space-y-1 pw:text-sm">
              <li>
                On mobile, use <strong>Pointer Mode</strong> for precise cursor control
              </li>
              <li>Use landscape mode on mobile for more screen space</li>
              <li>On iOS, you can hide the browser toolbar in Safari settings for more screen space</li>
              <li>Installing as PWA on mobile provides full screen experience without browser UI</li>
            </ul>
          </div>
        </div>
      </div>
      <div
        className="pw:modal-backdrop"
        onClick={onClose}
        onKeyDown={e => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
      />
    </div>
  );
};
