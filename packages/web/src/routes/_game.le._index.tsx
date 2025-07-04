import PoBController from "../components/PoBController";
import type { Route } from "../routes/+types/_game.le._index";

export default function (p: Route.ComponentProps) {
  const { games } = p.matches[1].data;
  return <PoBController game="le" version={games.le.head} isHead={true} />;
}
