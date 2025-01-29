import { useOutletContext } from "react-router";
import PobWindow from "../components/PobWindow";
import type { RootLayoutContext } from "./_layout";

export default function PoE1() {
  const ctx = useOutletContext<RootLayoutContext>();
  return (
    <PobWindow product={ctx.product} version={ctx.version} onFrame={ctx.handleFrame} onTitleChange={ctx.setTitle} />
  );
}
