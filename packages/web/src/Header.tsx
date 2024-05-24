import { useAuth0 } from "@auth0/auth0-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

function Auth() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <span className="loading loading-spinner loading-md" />;
  }
  if (isAuthenticated) {
    return (
      <>
        <Menu>
          <MenuButton className="btn btn-ghost btn-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <title>user-circle</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>

            {user?.name}
          </MenuButton>
          <MenuItems className="menu bg-base-200 w-56 rounded-box" anchor="bottom end">
            <MenuItem>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <title>Logout</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                  />
                </svg>
                Logout
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </>
    );
  }
  return (
    <>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => loginWithRedirect()}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <title>Login</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
          />
        </svg>
        Login
      </button>
    </>
  );
}

export default function Header(props: {
  version: string;
  onVersionChange: (version: string) => void;
}) {
  return (
    <>
      <div className="navbar bg-neutral text-neutral-content">
        <div className="flex-1 gap-2">
          <img className="w-8 h-8 rounded-box" src="/favicon.png" alt="" />
          <span className="text-xl font-bold font-['Poiret_One']">pob.cool</span>
          <span className="badge badge-warning">This site is under development</span>
        </div>
        <div className="flex-none mr-4 gap-4">
          <select
            className="select select-sm"
            value={props.version}
            onChange={(e) => props.onVersionChange(e.target.value)}
          >
            <option value="2.42.0">2.42.0</option>
            <option value="2.41.1">2.41.1</option>
          </select>
          <Auth />
        </div>
      </div>
    </>
  );
}
