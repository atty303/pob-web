import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CloudIcon,
  DeviceTabletIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import React from "react";
import { Link, redirect } from "react-router";
import type { Route } from "../routes/+types/_index";
import type { Games } from "./_game";

dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);

export async function clientLoader(args: Route.ClientLoaderArgs) {
  // Redirect if the landing from the pobb.in
  if (location.hash.startsWith("#build=")) {
    return redirect(`/poe1${location.hash}`);
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
  function versionTable(game: keyof Games) {
    return (
      <div className="card bg-base-100 shadow-md p-4 w-full">
        <h3 className="text-2xl font-semibold mb-4">{games[game].name} Versions</h3>
        <div className="overflow-auto max-h-96">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Version</th>
                <th>Release Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loaderData[game].versions.map(_ => (
                <tr key={_.value}>
                  <td>{_.value}</td>
                  <td>{dayjs.utc(_.date).local().format("ll")}</td>
                  <td>
                    <Link to={`/${game}/versions/${_.value}`} className="btn btn-primary btn-xs">
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="hero min-h-160" style={{ backgroundImage: "url('/public/hero-bg.webp')" }}>
        <div className="hero-overlay backdrop-blur-xs" />
        <div className="hero-content text-center flex flex-col items-center z-10">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-5">pob.cool</h1>
            <p className="mb-5 text-xl">
              The web version of Path of Building. Explore and save your builds anywhere, anytime.
            </p>
          </div>

          {/* PoE1 and PoE2 Start Buttons */}
          <div className="flex flex-col md:flex-row gap-8 mt-4">
            {/* PoE2 Card */}
            <div className="card w-64 bg-base-100 shadow-md p-4 transition-shadow hover:shadow-lg">
              <span className="min-h-44">
                <img src="/logo-poe2.webp" alt="Path of Exile 2" className="mx-auto mb-4" />
              </span>
              <Link to="/poe2" className="btn btn-primary btn-block">
                Start for Path of Exile 2 <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            {/* PoE1 Card */}
            <div className="card w-64 bg-base-100 shadow-md p-4 transition-shadow hover:shadow-lg">
              <span className="min-h-44">
                <img src="/logo-poe1.webp" alt="Path of Exile 1" className="mx-auto mb-4" />
              </span>
              <Link to="/poe1" className="btn btn-primary btn-block">
                Start for Path of Exile 1 <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 px-4 bg-base-100">
        <h2 className="text-3xl font-bold text-center mb-6">
          <ExclamationTriangleIcon className="size-8 mr-2 inline text-warning" />
          Limitations
        </h2>
        <div role="alert" className="max-w-4xl mx-auto alert alert-warning prose">
          <ul>
            <li>
              Do not enter <code className="text-inherit">POESESSID</code> in the PoB of this site.
            </li>
            <li>
              For security reasons, network requests containing the <code className="text-inherit">POESESSID</code>{" "}
              cookie will be unconditionally rejected.
            </li>
            <li>
              Network access is through our CORS proxy, so all users have the same source IP. This will likely cause
              rate limiting.
            </li>
          </ul>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 px-4 bg-base-100">
        <h2 className="text-3xl font-bold text-center mb-6">
          <SparklesIcon className="size-8 mr-2 inline text-accent" />
          Key Features
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1: Original PoB in Your Browser */}
          <div className="card bg-base-200 shadow-md p-4 rounded-box">
            <div className="flex items-center mb-2">
              <GlobeAltIcon className="h-8 w-8 text-accent mr-2" />
              <h3 className="text-xl font-semibold">Original PoB in Your Browser</h3>
            </div>
            <p>Enjoy the full functionality of the original Path of Building without installing anything locally.</p>
          </div>

          {/* Feature 2: Switch Between PoB Versions */}
          <div className="card bg-base-200 shadow-md p-4 rounded-box">
            <div className="flex items-center mb-2">
              <ArrowPathIcon className="h-8 w-8 text-accent mr-2" />
              <h3 className="text-xl font-semibold">Switch Between PoB Versions</h3>
            </div>
            <p>Quickly revert to older PoB builds or try the latest beta—all within a few clicks.</p>
          </div>

          {/* Feature 3: Cloud Saving */}
          <div className="card bg-base-200 shadow-md p-4 rounded-box">
            <div className="flex items-center mb-2">
              <CloudIcon className="h-8 w-8 text-accent mr-2" />
              <h3 className="text-xl font-semibold">Cloud Saving</h3>
            </div>
            <p>Store your builds in the cloud, and access them from any device.</p>
          </div>

          {/* Feature 4: Available Anywhere */}
          <div className="card bg-base-200 shadow-md p-4 rounded-box">
            <div className="flex items-center mb-2">
              <DeviceTabletIcon className="h-8 w-8 text-accent mr-2" />
              <h3 className="text-xl font-semibold">Available Anywhere</h3>
            </div>
            <p>Access your builds through modern browsers (Chrome, Firefox, Safari) on multiple platforms.</p>
          </div>
        </div>
      </section>

      {/* Version Lists Section with Tables */}
      <section className="py-10 px-4 bg-base-200 flex-grow">
        <h2 className="text-3xl font-bold text-center mb-8">
          <ArchiveBoxIcon className="size-8 mr-2 inline text-accent" />
          Available Versions
        </h2>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
          {/* PoE2 Versions Table */}
          {versionTable("poe2")}

          {/* PoE1 Versions Table */}
          {versionTable("poe1")}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-center flex items-center p-8 bg-base-300 text-base-content">
        <aside className="flex-1">
          <span>
            © 2025 Koji AGAWA (
            <a className="link" href="https://x.com/atty303" target="_blank" rel="noreferrer">
              @atty303
            </a>
            ) - This product isn't affiliated with or endorsed by Grinding Gear Games in any way.
          </span>
        </aside>
        <div className="flex-none">
          <a href="https://github.com/atty303/poe-web" target="_blank" rel="noreferrer">
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 98 96">
              <title>GitHub</title>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
