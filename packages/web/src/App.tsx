import { useState } from "react";
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

  const [version, setVersion] = useState("2.42.0");
  const [title, setTitle] = useState("");

  return (
    <>
      <div className="grid grid-cols-1 grid-rows-[auto_1fr] min-h-screen">
        <Header version={version} onVersionChange={setVersion} title={title} />

        <div className="border-y border-neutral-content">
          <PobWindow onFrame={handleFrame} version={version} onTitleChange={setTitle} />
        </div>

        <Footer frameTime={frameTime} />
      </div>
    </>
  );
}
