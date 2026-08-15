import { startTransition, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

startTransition(() => {
  const app = (
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
  if (window.location.pathname === "/") {
    hydrateRoot(document, app);
  } else {
    createRoot(document as unknown as Element).render(app);
  }
});
