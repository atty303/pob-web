import PoBController from "../components/PoBController.tsx";
import type { Route } from "../routes/+types/_game.poe1.versions.$version";

export default function (p: Route.ComponentProps) {
  if (!p.params.version) throw new Response("Not Found", { status: 404 });
  return <PoBController game="poe1" version={p.params.version} isHead={false} />;
}
