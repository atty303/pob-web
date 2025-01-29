import App from "../App";
import type { Route } from "./+types/home";

export function meta(args: Route.MetaArgs) {
  return [{ title: "New React Router App" }, { name: "description", content: "Welcome to React Router!" }];
}

export default function Home() {
  return <App />;
}
