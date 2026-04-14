# ADR 0003 — Three.js ExtrudeGeometry for image-based models

**Date:** 2026-04-14
**Status:** Accepted

## Context

Image-based models (cookie cutters, stamps) need to convert a 2D image outline into a 3D shape. This can be done via OpenSCAD (`linear_extrude` + imported SVG) or directly in Three.js.

## Decision

Use **Three.js `ExtrudeGeometry`** for all image-based models (cookie cutters, stamps).

## Rationale

- No WASM compilation step — geometry is built in milliseconds
- Real-time preview updates as parameters change (height, thickness, offset)
- `SVGLoader` in Three.js parses SVG paths directly to `ShapePath` objects
- `ExtrudeGeometry` handles holes, concave polygons, and complex outlines
- STL export works directly from Three.js `BufferGeometry` via `STLExporter`

## Alternatives considered

- **OpenSCAD WASM + SVG import**: works but adds 2–10 second compilation delay for every parameter change; poor UX for interactive editing
- **Three.js + CSG**: would allow boolean operations but not needed for cookie cutters

## Consequences

- **Positive**: Instant feedback on parameter changes
- **Positive**: No dependency on WASM for the most popular model types
- **Positive**: Colored preview (material color) works out of the box
- **Negative**: Limited to extrusion-based shapes; complex 3D boolean operations require OpenSCAD
- **Negative**: Three.js `SVGLoader` has edge cases with malformed SVG paths

## Implementation note

The `ThreeGeometryBuilder` infrastructure adapter handles both SVG-from-image and SVG-from-builtin-shapes code paths. Builtin shapes (circle, square, star, hexagon) are generated as Three.js `Shape` objects without going through SVG.
