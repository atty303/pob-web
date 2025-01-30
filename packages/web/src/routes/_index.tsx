import { Link, redirect } from "react-router";
import type { Route } from "../routes/+types/_index";
import type { Games } from "./_game";

export async function clientLoader(args: Route.ClientLoaderArgs) {
  // Redirect if the landing from the pobb.in
  if (location.hash.startsWith("#build=")) {
    return redirect(`/poe1/${location.hash}`);
  }

  const rep = await fetch(__VERSION_URL__);
  return (await rep.json()) as Games;
}

const games = {
  poe1: {
    name: "Path of Exile 1",
  },
  poe2: {
    name: "Path of Exile 2",
  },
};

export default function Index({ loaderData }: Route.ComponentProps) {
  function versionsListOf(game: keyof Games) {
    const versions = loaderData[game].versions.map(version => (
      <li key={version} className="list-row">
        <Link to={`/${game}/versions/${version}/`} className="link link-primary link-hover">
          {version}
        </Link>
      </li>
    ));
    return (
      <div className="collapse collapse-arrow">
        <input type="checkbox" />
        <div className="collapse-title font-semibold">Other versions</div>
        <div className="collapse-content">
          <ul className="list">{versions}</ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto grid max-w-lg grid-cols-1 items-center lg:max-w-4xl lg:grid-cols-2">
        {(["poe2", "poe1"] as const).map(game => (
          <div key={game}>
            <h3 className="font-bold text-xl">{games[game].name}</h3>
            <p>
              Most recent version: {loaderData[game].head}
              <Link to={`/${game}/`} className="btn btn-primary btn-sm">
                Open
              </Link>
            </p>
            {versionsListOf(game)}
          </div>
        ))}
      </div>
      <h2>Help</h2>
      <article className="prose max-w-none">
        <p>This is browser version of Path of Building.</p>
        <h3>Limitations</h3>
        <ul>
          <li>
            <p>
              For security reasons, network requests containing the <code>POESESSID</code> cookie will be
              unconditionally rejected.
            </p>
            <p>
              <strong className="text-error">
                Do not enter <code>POESESSID</code> in the PoB of this site.
              </strong>
            </p>
          </li>
          <li>
            Network access is through our CORS proxy, so all users have the same source IP. This will likely cause rate
            limiting.
          </li>
        </ul>
        <h3>Features</h3>
        <ul>
          <li>Saved builds are stored in the browser's local storage.</li>
          <li>
            The <code>Cloud</code> folder appears when you are logged into the site. Builds saved there are stored in
            the cloud and can be accessed from anywhere.
          </li>
          <li>
            You can load a build by specifying a hash in the URL. eg.{" "}
            <code>https://pob.cool/poe1/versions/head/#build=https://pobb.in/WwTAYwulVav6</code>
          </li>
        </ul>
      </article>
    </div>
  );
}
