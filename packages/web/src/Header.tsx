import { useAuth0 } from "@auth0/auth0-react";

function Auth() {
  const { loginWithPopup, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <span className="loading loading-spinner loading-md" />;
  }
  if (isAuthenticated) {
    return (
      <>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          <img className="avatar w-6 h-6" src={user?.picture} alt={user?.name} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          Logout
        </button>
      </>
    );
  }
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => loginWithPopup()}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
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
          <a
            className="link badge badge-error"
            href="https://github.com/atty303/pob-web/labels/missing%20feature"
            target="_blank"
            rel="noreferrer"
          >
            Known missing features
          </a>
        </div>
        <div className="flex-none mr-4">
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
