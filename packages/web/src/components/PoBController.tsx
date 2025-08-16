import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import * as use from "react-use";
import type { Games } from "../routes/_game";
import { AuthButton } from "./AuthButton";
import { HomeButton } from "./HomeButton";
import PoBWindow from "./PoBWindow";
import { SettingsButton } from "./SettingsButton";

const { useLocalStorage, useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  const [title, setTitle] = useState<string>();
  useTitle(title ?? "pob.cool");

  const container = useRef<HTMLDivElement>(null);

  const [optOutTutorial, setOptOutTutorial] = useLocalStorage("optOutTutorial", false);

  // Create toolbar components for driver toolbar
  const ToolbarComponents = ({
    position,
    isLandscape,
  }: { position: "top" | "bottom" | "left" | "right"; isLandscape: boolean }) => {
    return (
      <>
        <HomeButton position={position} isLandscape={isLandscape} />
        <AuthButton
          position={position}
          isLandscape={isLandscape}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          userName={user?.name}
          onLogin={() => loginWithRedirect()}
          onLogout={() => logout()}
        />
        <SettingsButton
          position={position}
          isLandscape={isLandscape}
          game={p.game}
          optOutTutorial={optOutTutorial}
          setOptOutTutorial={setOptOutTutorial}
        />
      </>
    );
  };

  return (
    <div ref={container} className="relative w-full h-full">
      <PoBWindow
        game={p.game}
        version={p.version}
        onFrame={() => {}}
        onTitleChange={setTitle}
        onLayerVisibilityCallbackReady={() => {}}
        toolbarComponent={ToolbarComponents}
      />
    </div>
  );
}
