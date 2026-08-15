import type { Auth0ContextInterface } from "@auth0/auth0-react";

const LOGOUT_CONFIRMATION = "Logging out will reload the page and discard any unsaved changes. Continue?";

export function confirmAndLogout(auth0: Pick<Auth0ContextInterface, "logout">): boolean {
  if (!window.confirm(LOGOUT_CONFIRMATION)) return false;
  void auth0.logout({ logoutParams: { returnTo: window.location.origin } }).catch((error) => {
    console.warn("Logout did not complete", error);
  });
  return true;
}
