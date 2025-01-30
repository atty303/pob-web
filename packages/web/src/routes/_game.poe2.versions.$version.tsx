import PoBController from "../components/PoBController";
import type { Route } from "../routes/+types/_game.poe2.versions.$version";

export default function (p: Route.ComponentProps) {
  return <PoBController game="poe2" version={p.params.version} isHead={false} />;
}
