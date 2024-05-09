# Path of Building Web

> [!WARNING]
> This project is under development. 

This is online version of [Path of Building](https://pathofbuilding.community/).

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Emscripten](https://emscripten.org/)
- [CMake](https://cmake.org/)
- [Ninja](https://ninja-build.org/)

### Run driver shell

Set up a development server for the PoB engine alone.

```bash
cd packages/driver
bun install
bun run build
bun dev
```

### Run web app

Set up a web application development server.
You need to build the driver first.

```bash
cd packages/web
bun install
bun dev
```

## Under the hood

- Running the original PoB Lua code with [few modifications for Lua 5.2](https://github.com/atty303/PathOfBuilding/tree/pob-web).
- Using Emscripten to compile the PoB engine to WebAssembly.
- A module equivalent to SimpleGraphic is written in C to bridge with the JS driver.
- The JS renderer renders using WebGL.
- `packages/driver` emulates PoB windows with vanilla JS.
- `packages/web` is the React application that uses the driver.
