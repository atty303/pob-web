import PoBController from "../components/PoBController";
import type { Route } from "../routes/+types/_game.poe1._index";

export default function (p: Route.ComponentProps) {
  const { games } = p.matches[1].data;
  return <PoBController game="poe1" version={games.poe1.head} isHead={true} />;
}
