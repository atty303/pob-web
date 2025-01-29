import { useEffect, useState } from "react";
import * as use from "react-use";
import Footer from "./Footer";
import Header from "./Header";
import PobWindow from "./PobWindow";

const { useMedia } = use;

export default function App() {
  const [frameTime, setFrameTime] = useState(0);

  const handleFrame = (render: boolean, time: number) => {
    if (render) {
      setFrameTime(time);
    }
  };

  const [product, setProduct] = useState<"poe1" | "poe2">("poe1");
  useEffect(() => {
    setProduct(location.pathname.startsWith("/poe2-preview/") ? "poe2" : "poe1");
  }, []);

  const [versions, setVersions] = useState<string[]>([]);
  const [version, setVersion] = useState("v2.49.0");

  useEffect(() => {
    (async () => {
      const rep = await fetch(__VERSION_URL__);
      const json = await rep.json();
      setVersions(json[product].versions);
      setVersion(json[product].head);
    })();
  }, [product]);

  const [title, setTitle] = useState("");

  const is2XL = useMedia("(min-width: 1536px)");

  if (is2XL) {
    return (
      <div className="hidden 2xl:grid grid-cols-1 grid-rows-[auto_1fr] min-h-screen">
        <Header version={version} onVersionChange={setVersion} title={title} versions={versions} />

        <div className="border-y border-neutral-content">
          <PobWindow onFrame={handleFrame} product={product} version={version} onTitleChange={setTitle} />
        </div>

        <Footer frameTime={frameTime} />
      </div>
    );
  } else {
    return (
      <div className="grid min-h-screen 2xl:hidden">
        <PobWindow onFrame={handleFrame} product={product} version={version} onTitleChange={setTitle} />
      </div>
    );
  }
}
