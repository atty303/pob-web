# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pob-web is a browser-based version of Path of Building (PoB), a character build planner for Path of Exile. It runs the original PoB Lua code in the browser using WebAssembly.

## Architecture

The project uses a monorepo structure with npm workspaces:

- **packages/dds**: Microsoft DirectDraw Surface (.DDS) file parser
- **packages/driver**: PoB driver that emulates the desktop PoB window environment using vanilla JS and WebGL
- **packages/game**: Game data definitions
- **packages/packer**: Tool to package upstream PoB releases for browser use
- **packages/web**: React web application that hosts the driver

Key architecture points:
- Original PoB Lua code runs via a custom Lua 5.2 interpreter compiled to WebAssembly using Emscripten
- SimpleGraphic module is reimplemented in C to bridge with the JS driver
- WebGL is used for rendering
- Builds are stored in browser localStorage, with cloud storage available for logged-in users

## Development Commands

### Prerequisites
```bash
# Install mise (version manager)
# Install dependencies
mise install
hk install --mise

# Clone submodules (required for vendor/lua)
git submodule init
git submodule update
```

### Core Development Tasks
```bash
# Pack upstream PoB assets (required before first run)
mise run pack --game poe2 --tag v0.8.0

# Run driver development server
mise run driver:dev --game poe2 --version v0.8.0

# Run web app development server
mise run web:dev

# Build driver
mise run driver:build

# Build web app
mise run web:build
```

### Linting
```bash
hk fix --all
```

## Development Workflow

1. Before starting development, pack the upstream PoB assets for the version you want to work with
2. The driver must be built before running the web app
3. Use `mise run driver:dev` for driver-only development
4. Use `mise run web:dev` for full web application development
5. The project uses Biome for code formatting and linting

## Important Notes

- Network access goes through a CORS proxy
- POESESSID cookies are rejected for security
- No modifications are made to the original PoB code, only behavioral changes through the driver
- The project supports multiple games: poe1, poe2, and Last Epoch (le)

## Driver Overlay Components

The driver includes React overlay components for mobile interface elements (virtual keyboard, zoom controls, toolbar buttons). These components use scoped TailwindCSS styling:

- **CSS Scoping**: All TailwindCSS classes in overlay components must use the `pw:` prefix
- **Example**: Use `pw:absolute pw:z-50 pw:p-3` instead of `absolute z-50 p-3`
- **Configuration**: TailwindCSS is configured with `@theme { --prefix: pw:; }` in `packages/driver/src/js/overlay/overlay.css`
- **Browser Compatibility**: The `pw:` prefix approach ensures compatibility with older browsers (including Amazon Silk Browser) that don't support CSS layers

When working with overlay components, always use the `pw:` prefix for TailwindCSS classes to maintain proper CSS scoping and prevent conflicts with external stylesheets.
