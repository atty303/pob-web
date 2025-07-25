import PoBController from "../components/PoBController";
import type { Route } from "../routes/+types/_game.le.versions.$version";

export default function (p: Route.ComponentProps) {
  return <PoBController game="le" version={p.params.version} isHead={false} />;
}
