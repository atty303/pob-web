import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import type React from "react";

interface AuthButtonProps {
  position: "top" | "bottom" | "left" | "right";
  isLandscape: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  userName?: string;
  onLogin: () => void;
  onLogout: () => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ isLoading, isAuthenticated, userName, onLogin, onLogout }) => {
  if (isLoading) {
    return (
      <button type="button" className="pw:btn pw:btn-square pw:btn-ghost" disabled title="Loading...">
        <span className="pw:loading pw:loading-spinner pw:loading-sm" />
      </button>
    );
  } else if (isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onLogout}
        className="pw:btn pw:btn-square pw:btn-ghost"
        title={`Logout ${userName || "User"}`}
      >
        <UserCircleIcon className="pw:size-6" />
      </button>
    );
  } else {
    return (
      <button
        type="button"
        onClick={onLogin}
        className="pw:btn pw:btn-square pw:btn-ghost"
        title="Login to save builds to cloud"
      >
        <ArrowRightEndOnRectangleIcon className="pw:size-6" />
      </button>
    );
  }
};
