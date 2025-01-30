import PoBController from "../components/PoBController";
import type { Route } from "../routes/+types/_game.poe2.versions.head";

export default function (p: Route.ComponentProps) {
  const { games } = p.matches[1].data;
  return <PoBController game="poe2" version={games.poe2.head} isHead={true} />;
}
