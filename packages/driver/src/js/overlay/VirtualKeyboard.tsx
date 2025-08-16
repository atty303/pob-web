import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdDragIndicator } from "react-icons/md";
import type { KeyboardState } from "../keyboard";
import { KeyButton } from "./KeyButton";
import type { ToolbarCallbacks } from "./types";

interface VirtualKeyboardProps {
  isVisible: boolean;
  callbacks: ToolbarCallbacks;
  keyboardState: KeyboardState;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isVisible, callbacks, keyboardState }) => {
  // Use state to track keyboard state changes for React reactivity
  const [heldKeys, setHeldKeys] = useState(keyboardState.heldKeys);
  const [symbolMode, setSymbolMode] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const keyboardRef = useRef<HTMLDivElement>(null);

  // Function to constrain position within viewport
  const constrainPositionToViewport = useCallback((pos: { x: number; y: number }) => {
    if (!keyboardRef.current) return pos;

    const keyboardRect = keyboardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // The keyboard is positioned with:
    // left: 50%, bottom: 20px, marginLeft: -200px, transform: translate(x, y)
    // So actual position is: left = 50% - 200px + x, bottom = 20px - y
    const keyboardWidth = keyboardRect.width;
    const keyboardHeight = keyboardRect.height;

    // Calculate actual screen coordinates
    const actualLeft = viewportWidth / 2 - 200 + pos.x;
    const actualBottom = 20 - pos.y; // bottom position (distance from bottom edge)
    const actualTop = viewportHeight - actualBottom - keyboardHeight;

    let constrainedX = pos.x;
    let constrainedY = pos.y;

    // Constrain X position (left and right edges)
    if (actualLeft < 0) {
      constrainedX = -(viewportWidth / 2 - 200);
    } else if (actualLeft + keyboardWidth > viewportWidth) {
      constrainedX = viewportWidth - keyboardWidth - (viewportWidth / 2 - 200);
    }

    // Constrain Y position (top and bottom edges)
    if (actualTop < 0) {
      // Too high - keyboard top edge above viewport top
      constrainedY = -(viewportHeight - keyboardHeight - 20);
    } else if (actualBottom < 0) {
      // Too low - keyboard bottom edge below viewport bottom
      constrainedY = 20;
    }

    return { x: constrainedX, y: constrainedY };
  }, []);

  // Update local state when keyboard state changes
  const updateLocalState = useCallback(() => {
    setHeldKeys(new Set(keyboardState.heldKeys));
  }, [keyboardState]);

  // Listen for keyboard state changes
  useEffect(() => {
    keyboardState.addChangeListener(updateLocalState);
    return () => {
      keyboardState.removeChangeListener(updateLocalState);
    };
  }, [keyboardState, updateLocalState]);

  // Handle viewport resize to constrain keyboard position
  useEffect(() => {
    const handleResize = () => {
      setPosition(prevPosition => constrainPositionToViewport(prevPosition));
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [constrainPositionToViewport]);

  type KeyDefinition = {
    event: string; // DOM event name
    display: string; // What to show on the button
    width?: string; // Optional custom width
    isModifier?: boolean; // Whether this is a modifier key
    isSpecial?: boolean; // Whether this is a special key
  };

  const letterKeyLayout = useMemo(
    (): KeyDefinition[][] => [
      [
        { event: "1", display: "1" },
        { event: "2", display: "2" },
        { event: "3", display: "3" },
        { event: "4", display: "4" },
        { event: "5", display: "5" },
        { event: "6", display: "6" },
        { event: "7", display: "7" },
        { event: "8", display: "8" },
        { event: "9", display: "9" },
        { event: "0", display: "0" },
      ],
      [
        { event: "q", display: "Q" },
        { event: "w", display: "W" },
        { event: "e", display: "E" },
        { event: "r", display: "R" },
        { event: "t", display: "T" },
        { event: "y", display: "Y" },
        { event: "u", display: "U" },
        { event: "i", display: "I" },
        { event: "o", display: "O" },
        { event: "p", display: "P" },
      ],
      [
        { event: "a", display: "A" },
        { event: "s", display: "S" },
        { event: "d", display: "D" },
        { event: "f", display: "F" },
        { event: "g", display: "G" },
        { event: "h", display: "H" },
        { event: "j", display: "J" },
        { event: "k", display: "K" },
        { event: "l", display: "L" },
      ],
      [
        { event: "Shift", display: "Shift", isModifier: true },
        { event: "z", display: "Z" },
        { event: "x", display: "X" },
        { event: "c", display: "C" },
        { event: "v", display: "V" },
        { event: "b", display: "B" },
        { event: "n", display: "N" },
        { event: "m", display: "M" },
        { event: "ArrowUp", display: "↑", isSpecial: true },
        { event: "Backspace", display: "⌫", isSpecial: true },
      ],
      [
        { event: "SymbolMode", display: "!?#", width: "60px", isSpecial: true },
        { event: "Control", display: "Ctrl", isModifier: true },
        { event: "Alt", display: "Alt", isModifier: true },
        { event: "Space", display: "Space", width: "120px", isSpecial: true },
        { event: "Enter", display: "↵", isSpecial: true },
        { event: "ArrowLeft", display: "←", isSpecial: true },
        { event: "ArrowDown", display: "↓", isSpecial: true },
        { event: "ArrowRight", display: "→", isSpecial: true },
      ],
    ],
    [],
  );

  const symbolKeyLayout = useMemo(
    (): KeyDefinition[][] => [
      [
        { event: "!", display: "!" },
        { event: "@", display: "@" },
        { event: "#", display: "#" },
        { event: "$", display: "$" },
        { event: "%", display: "%" },
        { event: "^", display: "^" },
        { event: "&", display: "&" },
        { event: "*", display: "*" },
        { event: "(", display: "(" },
        { event: ")", display: ")" },
      ],
      [
        { event: "`", display: "`" },
        { event: "~", display: "~" },
        { event: "-", display: "-" },
        { event: "_", display: "_" },
        { event: "=", display: "=" },
        { event: "+", display: "+" },
        { event: "[", display: "[" },
        { event: "]", display: "]" },
        { event: "{", display: "{" },
        { event: "}", display: "}" },
      ],
      [
        { event: ";", display: ";" },
        { event: ":", display: ":" },
        { event: "'", display: "'" },
        { event: '"', display: '"' },
        { event: "\\", display: "\\" },
        { event: "|", display: "|" },
        { event: ",", display: "," },
        { event: ".", display: "." },
        { event: "<", display: "<" },
      ],
      [
        { event: "Shift", display: "Shift", isModifier: true },
        { event: "/", display: "/" },
        { event: "?", display: "?" },
        { event: ">", display: ">" },
        { event: "Tab", display: "Tab", width: "60px", isSpecial: true },
        { event: "Escape", display: "Esc", width: "60px", isSpecial: true },
        { event: "ArrowUp", display: "↑", isSpecial: true },
        { event: "Delete", display: "Del", isSpecial: true },
      ],
      [
        { event: "LetterMode", display: "ABC", width: "60px", isSpecial: true },
        { event: "Control", display: "Ctrl", width: "60px", isModifier: true },
        { event: "Alt", display: "Alt", width: "60px", isModifier: true },
        { event: "Space", display: "Space", width: "120px", isSpecial: true },
        { event: "Enter", display: "↵", isSpecial: true },
        { event: "ArrowLeft", display: "←", isSpecial: true },
        { event: "ArrowDown", display: "↓", isSpecial: true },
        { event: "ArrowRight", display: "→", isSpecial: true },
      ],
    ],
    [],
  );

  const keyLayout = symbolMode ? symbolKeyLayout : letterKeyLayout;

  const handleKeyPress = useCallback(
    (eventKey: string, keyDef: KeyDefinition) => {
      const { isModifier = false } = keyDef;

      // Handle special mode switching keys
      if (eventKey === "SymbolMode") {
        setSymbolMode(true);
        return;
      } else if (eventKey === "LetterMode") {
        setSymbolMode(false);
        return;
      }

      keyboardState.virtualKeyPress(eventKey, isModifier, 0);
    },
    [keyboardState],
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setDragStart({
        x: clientX - position.x,
        y: clientY - position.y,
      });
    },
    [position],
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const newPosition = {
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      };

      setPosition(constrainPositionToViewport(newPosition));
    },
    [isDragging, dragStart, constrainPositionToViewport],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      document.addEventListener("touchmove", handleDragMove);
      document.addEventListener("touchend", handleDragEnd);

      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
        document.removeEventListener("touchmove", handleDragMove);
        document.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={keyboardRef}
      className="pw:absolute"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        left: "50%",
        bottom: "20px",
        marginLeft: "-200px", // Half of approximate keyboard width
        cursor: isDragging ? "grabbing" : "default",
        pointerEvents: "none",
      }}
    >
      <div className="pw:bg-base-200/80 pw:rounded pw:relative pw:pointer-events-auto pw:p-0.5 pw:pt-6">
        <div className="pw:m-2 pw:gap-0.5">
          {keyLayout.map((row, rowIndex) => (
            <div
              key={`row-${row.map(k => k.event).join("-")}`}
              className="pw:flex pw:gap-0.5 pw:justify-center pw:w-full"
            >
              {row.map(keyDef => {
                const { event, display, width = "44px", isModifier = false } = keyDef;

                // Determine if this key should show as active (held or mode buttons)
                const isActive =
                  (isModifier && heldKeys.has(event)) ||
                  (event === "SymbolMode" && symbolMode) ||
                  (event === "LetterMode" && !symbolMode);

                return (
                  <KeyButton
                    key={event}
                    label={display}
                    char={display}
                    width={width}
                    callbacks={{
                      onClick: () => handleKeyPress(event, keyDef),
                    }}
                    isActive={isActive}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Drag Handle */}
        <div
          className="pw:absolute pw:top-1 pw:right-1 pw:w-6 pw:h-6 pw:flex pw:items-center pw:justify-center pw:text-base-content/60 pw:hover:text-base-content pw:cursor-grab pw:active:cursor-grabbing pw:bg-base-300/50 pw:rounded"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{ touchAction: "none" }}
        >
          <MdDragIndicator size={16} />
        </div>
      </div>
    </div>
  );
};
