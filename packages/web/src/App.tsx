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

	return (
		<>
			<div className="grid grid-cols-1 grid-rows-[auto_1fr] min-h-screen">
				<Header version={version} onVersionChange={setVersion} />

				<div className="p-2">
					<PobWindow onFrame={handleFrame} version={version} />
				</div>

				<Footer frameTime={frameTime} />
			</div>
		</>
	);
}
