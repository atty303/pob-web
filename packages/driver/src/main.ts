// @ts-ignore
import {default as Module} from "../dist/driver.mjs";

Module({
    print: console.log,
    printErr: console.error,
}).then((module: any) => {
    console.log(module);
    console.log(module._init());
});
