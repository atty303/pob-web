import { startTransition, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

startTransition(() => {
  const app = (
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
  if (/^\/(?:poe1|poe2|le)(?:\/|$)/.test(window.location.pathname)) {
    createRoot(document as unknown as Element).render(app);
  } else {
    hydrateRoot(document, app);
  }
});
