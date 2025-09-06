import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdDragIndicator } from "react-icons/md";
import type { DOMKey, DOMKeyboardState } from "../keyboard";
import { KeyButton } from "./KeyButton";

interface VirtualKeyboardProps {
  isVisible: boolean;
  keyboardState: DOMKeyboardState;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isVisible, keyboardState }) => {
  const [heldKeys, setHeldKeys] = useState(new Set<DOMKey>());
  const [symbolMode, setSymbolMode] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const keyboardRef = useRef<HTMLDivElement>(null);

  const calculateInitialPosition = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;

    const approxKeyboardWidth = 400;
    const toolbarSize = 60;

    let initialX = 0;
    let initialY = 0;

    if (isLandscape) {
      const availableWidth = viewportWidth - toolbarSize;
      const keyboardCenterX = availableWidth / 2;
      const baselineX = viewportWidth / 2 - approxKeyboardWidth / 2;
      initialX = keyboardCenterX - baselineX;

      initialY = -60;
    } else {
      initialX = 0;
      initialY = -(toolbarSize + 20);
    }

    return { x: initialX, y: initialY };
  }, []);

  const constrainPositionToViewport = useCallback((pos: { x: number; y: number }) => {
    if (!keyboardRef.current) return pos;

    const keyboardRect = keyboardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const keyboardWidth = keyboardRect.width;
    const keyboardHeight = keyboardRect.height;

    const actualLeft = viewportWidth / 2 - 200 + pos.x;
    const actualBottom = 20 - pos.y;
    const actualTop = viewportHeight - actualBottom - keyboardHeight;

    let constrainedX = pos.x;
    let constrainedY = pos.y;

    if (actualLeft < 0) {
      constrainedX = -(viewportWidth / 2 - 200);
    } else if (actualLeft + keyboardWidth > viewportWidth) {
      constrainedX = viewportWidth - keyboardWidth - (viewportWidth / 2 - 200);
    }

    if (actualTop < 0) {
      constrainedY = -(viewportHeight - keyboardHeight - 20);
    } else if (actualBottom < 0) {
      constrainedY = 20;
    }

    return { x: constrainedX, y: constrainedY };
  }, []);

  const getInitialPosition = useCallback(() => {
    return calculateInitialPosition();
  }, [calculateInitialPosition]);

  useEffect(() => {
    if (isVisible && !isInitialized) {
      const timer = setTimeout(() => {
        const initialPosition = getInitialPosition();
        setPosition(initialPosition);
        setIsInitialized(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isInitialized, getInitialPosition]);

  useEffect(() => {
    if (!isInitialized || !keyboardRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      setPosition(prevPosition => constrainPositionToViewport(prevPosition));
    });

    const rootContainer = keyboardRef.current.closest('[style*="position: relative"]') || document.body;
    resizeObserver.observe(rootContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isInitialized, constrainPositionToViewport]);

  useEffect(() => {
    const handleResize = () => {
      if (isInitialized) {
        setPosition(prevPosition => constrainPositionToViewport(prevPosition));
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [constrainPositionToViewport, isInitialized]);

  type KeyDefinition = {
    event: string;
    display: string;
    width?: string;
    isModifier?: boolean;
    isSpecial?: boolean;
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
        { event: "SymbolMode", display: "!?#", isSpecial: true },
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
        { event: "LetterMode", display: "ABC", isSpecial: true },
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

      if (eventKey === "SymbolMode") {
        setSymbolMode(true);
        return;
      } else if (eventKey === "LetterMode") {
        setSymbolMode(false);
        return;
      }

      const newHeldKeys = keyboardState.virtualKeyPress(eventKey as DOMKey, isModifier);
      setHeldKeys(new Set(newHeldKeys));
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

  return (
    <div
      ref={keyboardRef}
      className="pw:absolute"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        left: "50%",
        bottom: "20px",
        marginLeft: "-200px",
        cursor: isDragging ? "grabbing" : "default",
        pointerEvents: "none",
        display: isVisible ? "block" : "none",
        visibility: isInitialized ? "visible" : "hidden",
      }}
    >
      <div className="pw:bg-base-200/80 pw:rounded pw:relative pw:pointer-events-auto pw:px-0.5 pw:pt-6 pw:pb-2">
        <div className="">
          {keyLayout.map((row, rowIndex) => (
            <div
              key={`row-${row.map(k => k.event).join("-")}`}
              className="pw:flex pw:gap-0.5 pw:justify-center pw:w-full pw:mt-1"
            >
              {row.map(keyDef => {
                const { event, display, width = "38px", isModifier = false } = keyDef;

                const isActive =
                  (isModifier && heldKeys.has(event as DOMKey)) ||
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
