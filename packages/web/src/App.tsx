import PobWindow from "./PobWindow.tsx";
import {useState} from "react";
import Header from "./Header.tsx";
import Footer from "./Footer.tsx";

export default function App() {
    const [frameTime , setFrameTime] = useState(0);

    const handleFrame = (render: boolean, time: number) => {
        if (render) {
            setFrameTime(time);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 grid-rows-[auto_1fr] min-h-screen">
                <Header/>

                <div className="p-2">
                    <PobWindow onFrame={handleFrame}/>
                </div>

                <Footer frameTime={frameTime}/>
            </div>
        </>
    )
}
