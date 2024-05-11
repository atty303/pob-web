import {useAuth0} from "@auth0/auth0-react";
import {useEffect, useState} from "react";

function Auth() {
    const {loginWithPopup, logout, user, isAuthenticated, isLoading} = useAuth0();

    if (isLoading) {
        return <span className="loading loading-spinner loading-md"></span>;
    } else if (isAuthenticated) {
        return (
            <>
                <button className="btn btn-ghost btn-sm"
                        onClick={() => logout({logoutParams: {returnTo: window.location.origin}})}>
                    <img className="avatar w-6 h-6" src={user?.picture} alt={user?.name}/>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                         stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/>
                    </svg>
                </button>
            </>
        );
    } else {
        return (
            <>
                <button className="btn btn-ghost btn-sm" onClick={() => loginWithPopup()}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                         stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"/>
                    </svg>
                    Login
                </button>
            </>
        );
    }
}

export default function Header(p: { frameTime: number }) {
    const a = useAuth0();

    const [token, setToken] = useState<string>();
    useEffect(() => {
        async function getToken() {
            const t = await a.getAccessTokenSilently();
            setToken(t);
        }
        getToken();
    }, []);

    const debug = async () => {
        const r0 = await fetch("/api/kv/put/test/sub/hoge.txt", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({key: "test", value: "test"}),
        });
        console.log(r0);

        const r = await fetch("/api/kv/list", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({key: "test", value: "test"}),
        });
        console.log(await r.json());

        const r2 = await fetch("/api/kv/get/test/sub/hoge.txt", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log(await r2.text());
    };

    return (
        <>
            <div className="navbar bg-neutral text-neutral-content">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl">pob.cool</a>
                    <span className="badge badge-warning">This site is a work in progress</span>
                </div>
                <div className="flex-none pr-4">
                    <span className="badge">
                        Render: {p.frameTime.toFixed(1)}ms
                    </span>
                </div>
                <div className="flex-none pr-4">
                    <a className="btn btn-ghost" href="https://github.com/atty303/pob-web/blob/main/CHANGELOG.md"
                       target="_blank">Changelog</a>
                </div>
                <div className="flex-none pr-4">
                    <Auth/>
                    <button className="btn btn-ghost" onClick={debug}>Debug</button>
                </div>
            </div>
        </>
    );
}
