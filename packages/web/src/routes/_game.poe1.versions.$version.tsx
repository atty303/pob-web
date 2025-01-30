import PoBController from "../components/PoBController";
import type { Route } from "../routes/+types/_game.poe1.versions.$version";

export default function (p: Route.ComponentProps) {
  return <PoBController game="poe1" version={p.params.version} isHead={false} />;
}
