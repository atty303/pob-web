import { redirect } from "react-router";
import type { Route } from "../routes/+types/_index";

export async function clientLoader(args: Route.ClientLoaderArgs) {
  return redirect("/1");
}

export default function Index({ loaderData }: Route.ComponentProps) {}
