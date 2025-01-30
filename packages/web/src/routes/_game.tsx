import { Outlet } from "react-router";
import type { Route } from "../routes/+types/_game";

export type Games = {
  poe1: { head: string; versions: string[] };
  poe2: { head: string; versions: string[] };
};

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const rep = await fetch(__VERSION_URL__);
  const games = (await rep.json()) as Games;
  return { games };
}

export default function () {
  return <Outlet />;
}
