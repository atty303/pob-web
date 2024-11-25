import { useEffect, useState } from "react";
import { useMedia } from "react-use";
import Footer from "./Footer.tsx";
import Header from "./Header.tsx";
import PobWindow from "./PobWindow.tsx";

export default function App() {
  const [frameTime, setFrameTime] = useState(0);

  const handleFrame = (render: boolean, time: number) => {
    if (render) {
      setFrameTime(time);
    }
  };

  const [versions, setVersions] = useState<string[]>([]);
  const [version, setVersion] = useState("v2.49.0");

  useEffect(() => {
    (async () => {
      const rep = await fetch(__VERSION_URL__);
      const json = await rep.json();
      setVersions(json.versions);
      setVersion(json.head);
    })();
  }, []);

  const [title, setTitle] = useState("");

  const is2XL = useMedia("(min-width: 1536px)");

  if (is2XL) {
    return (
      <div className="hidden 2xl:grid grid-cols-1 grid-rows-[auto_1fr] min-h-screen">
        <Header version={version} onVersionChange={setVersion} title={title} versions={versions} />

        <div className="border-y border-neutral-content">
          <PobWindow onFrame={handleFrame} version={version} onTitleChange={setTitle} />
        </div>

        <Footer frameTime={frameTime} />
      </div>
    );
  } else {
    return (
      <div className="grid min-h-screen 2xl:hidden">
        <PobWindow onFrame={handleFrame} version={version} onTitleChange={setTitle} />
      </div>
    );
  }
}
