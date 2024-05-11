# Path of Building Web

[![wakatime](https://wakatime.com/badge/user/018dace5-5642-4ac8-88a7-2ec0a867f8a7/project/fa7418b8-8ddb-479c-805b-ce2043f24d24.svg)](https://wakatime.com/badge/user/018dace5-5642-4ac8-88a7-2ec0a867f8a7/project/fa7418b8-8ddb-479c-805b-ce2043f24d24)

> [!WARNING]
> This project is under development. 

This is online version of [Path of Building](https://pathofbuilding.community/).

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

Set up a development server for the PoB engine alone.

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
