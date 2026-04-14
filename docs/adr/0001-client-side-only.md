# ADR 0001 — Client-side only rendering in V1

**Date:** 2026-04-14
**Status:** Accepted

## Context

Forja3D needs to generate 3D models from user parameters and images. This requires a rendering engine (OpenSCAD or Three.js). We need to decide whether rendering happens on a server or in the browser.

## Decision

All rendering in V1 is **client-side only**. No backend server is required.

## Rationale

- V1 is a personal project hosted on GitHub Pages, which is static-only (no server execution)
- Eliminates infrastructure costs and complexity
- OpenSCAD can be compiled to WebAssembly and run in the browser
- Three.js runs natively in the browser and can extrude SVG paths to 3D geometry
- Browser download is sufficient for STL export — no cloud storage needed

## Consequences

- **Positive**: Zero hosting cost, no backend to maintain, simple deployment
- **Positive**: No latency from network round-trips
- **Negative**: WASM compilation is slower than native OpenSCAD binary
- **Negative**: Large WASM binary increases initial page load (~20–30MB)
- **Negative**: No persistent user data, no generation history

## V2 migration path

Replace `IOpenScadRenderer`'s WASM implementation with an HTTP adapter that calls `/api/generate`. No domain or use case code changes required. See [V2_ROADMAP.md](../V2_ROADMAP.md#server-side-rendering).
