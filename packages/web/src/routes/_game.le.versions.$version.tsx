import PoBController from "../components/PoBController.tsx";
import type { Route } from "../routes/+types/_game.le.versions.$version";

export default function (p: Route.ComponentProps) {
  if (!p.params.version) throw new Response("Not Found", { status: 404 });
  return <PoBController game="le" version={p.params.version} isHead={false} />;
}
