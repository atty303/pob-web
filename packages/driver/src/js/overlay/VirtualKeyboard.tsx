import type React from "react";
import { useMemo } from "react";
import { KeyButton } from "./KeyButton";
import type { ToolbarCallbacks } from "./types";

interface VirtualKeyboardProps {
  isVisible: boolean;
  callbacks: ToolbarCallbacks;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isVisible, callbacks }) => {
  const keyLayout = useMemo(
    () => [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "↵"],
      ["Z", "X", "C", "V", "Space", "B", "N", "M", ".", ","],
    ],
    [],
  );

  const getKeyProps = (key: string) => {
    let width = "44px";
    let char = key.toLowerCase();

    if (key === "Space") {
      width = "88px";
      char = " ";
    } else if (key === "⌫") {
      width = "44px";
      char = "\b";
    } else if (key === "↵") {
      width = "44px";
      char = "\r";
    }

    return { width, char };
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "8px",
        background: "rgba(32, 32, 32, 0.95)",
        border: "1px solid rgba(60, 60, 60, 0.8)",
        borderRadius: "4px",
        width: "100%",
        boxSizing: "border-box",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {keyLayout.map(row => (
        <div
          key={row.join("-")}
          style={{
            display: "flex",
            gap: "2px",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {row.map(key => {
            const { width, char } = getKeyProps(key);
            return <KeyButton key={key} label={key} char={char} width={width} callbacks={callbacks} />;
          })}
        </div>
      ))}
    </div>
  );
};
