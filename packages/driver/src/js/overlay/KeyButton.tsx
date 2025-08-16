import type React from "react";
import { useCallback } from "react";

interface KeyButtonProps {
  label: string;
  char: string;
  width?: string;
  callbacks: { onClick: (key: string) => void };
  isActive?: boolean;
}

export const KeyButton: React.FC<KeyButtonProps> = ({ label, char, width, callbacks, isActive = false }) => {
  const executeAction = useCallback(() => {
    callbacks.onClick(char);
  }, [char, callbacks]);

  const baseClasses = "pw:btn pw:btn-md pw:h-10";
  const variantClasses = isActive ? "pw:btn-primary" : "pw:btn-neutral pw:opacity-80";

  return (
    <button type="button" className={`${baseClasses} ${variantClasses}`} style={{ width }} onClick={executeAction}>
      {label === "Space" ? "␣" : label}
    </button>
  );
};
