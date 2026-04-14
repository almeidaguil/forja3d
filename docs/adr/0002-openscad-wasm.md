# ADR 0002 — OpenSCAD WASM for parametric models

**Date:** 2026-04-14
**Status:** Accepted

## Context

Parametric models (keychains with text, word signs, big letters) require a CSG (Constructive Solid Geometry) engine that can handle boolean operations, text extrusion, and complex shapes defined by formulas.

## Decision

Use **OpenSCAD compiled to WebAssembly** (`openscad-wasm-prebuilt`) for parametric text/geometry models.

## Rationale

- OpenSCAD is the industry standard for parametric 3D models
- `.scad` files are human-readable and version-controlled
- The WASM build runs fully in the browser with no server
- Allows reuse of existing OpenSCAD community models and libraries
- Text support is mature in OpenSCAD (font rendering, spacing, etc.)

## Alternatives considered

- **Three.js TextGeometry**: supports basic text but lacks CSG boolean operations; insufficient for complex parametric models
- **jscad/OpenJSCAD**: JS-native CSG engine; less mature, smaller community, limited font support

## Consequences

- **Positive**: Full OpenSCAD capability in the browser
- **Positive**: `.scad` templates are portable to a server in V2
- **Negative**: WASM binary is large (~20MB); must be loaded lazily
- **Negative**: Compilation takes 2–10 seconds depending on model complexity; loading feedback is required
- **Negative**: WASM runs on the main thread by default; must use a Web Worker to avoid UI freezing

## Implementation note

Load OpenSCAD WASM in a **Web Worker** to keep the UI responsive during compilation. Expose it through the `IOpenScadRenderer` port.
