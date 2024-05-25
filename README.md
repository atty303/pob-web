# pob.cool - Path of Building for browser environment

[![wakatime](https://wakatime.com/badge/user/018dace5-5642-4ac8-88a7-2ec0a867f8a7/project/fa7418b8-8ddb-479c-805b-ce2043f24d24.svg)](https://wakatime.com/badge/user/018dace5-5642-4ac8-88a7-2ec0a867f8a7/project/fa7418b8-8ddb-479c-805b-ce2043f24d24)

This is browser version of [Path of Building](https://pathofbuilding.community/).

## Features

- Run the PoB in your browser, that's all.
- You can select the version of the PoB to run.
- Saved builds are stored in the browser's local storage.
   - The `Cloud` folder appears when you are logged into the site. Builds saved there are stored in the cloud and can be accessed from anywhere.
- You can load a build by specifying a hash in the URL.
   - eg. https://pob.cool/#build=https://pobb.in/WwTAYwulVav6

## Limitations

- Network access is through our CORS proxy, so all users have the same source IP. This will likely cause rate limiting.
- For security reasons, requests containing the POESESSID cookie will be unconditionally rejected. Do not enter POESESSID in the PoB of this site.

## Principle

- We will not make any changes to the original PoB. This is because a lot of effort has been put into the PoB itself and
  we want the community to focus on developing the offline version.
  - However, it does make changes in behavior that are possible without changing the code.

## Development

### Prerequisites

- [Node 22](https://nodejs.org/)
- [Emscripten](https://emscripten.org/)
- [CMake](https://cmake.org/)
- [Ninja](https://ninja-build.org/)

### Install dependencies

```bash
npm ci
```

### Run driver shell

Set up a development server for the PoB web driver alone.

```bash
npm run build -w packages/driver
npm run dev -w packages/driver
```

### Run web app

Set up a web application development server.
You need to build the driver first.

```bash
npm run dev -w packages/web
```

## Under the hood

- Running the original PoB Lua code.
- Use a custom Lua 5.2 interpreter to run the code.
- Using Emscripten to compile the PoB engine to WebAssembly.
- A module equivalent to SimpleGraphic is written in C to bridge with the JS driver.
- The JS renderer renders using WebGL.
- `packages/driver` emulates PoB windows with vanilla JS.
- `packages/web` is the React application that uses the driver.
