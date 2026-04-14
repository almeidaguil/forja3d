# ADR 0004 — Canvas API contour tracing over Potrace in V1

**Date:** 2026-04-14
**Status:** Accepted

## Context

Image-to-3D models require tracing the silhouette of an uploaded image into an SVG path. Two options were evaluated: a Canvas API + marching-squares implementation, and the Potrace vectorization library.

## Decision

V1 uses a **Canvas API-based contour tracer** (threshold + marching-squares algorithm). Potrace is installed as a dependency but used as a fallback/upgrade path.

## Rationale

- Canvas API is native to the browser — zero extra bundle size
- Marching-squares is sufficient for the target use case (cookie cutters, stamps) where smooth outlines matter less than correct topology
- Potrace (`npm: potrace`) is a Node.js package; using it in the browser requires bundling or a WASM port, adding complexity
- The Canvas approach allows real-time threshold adjustment with immediate visual feedback

## Alternatives considered

- **Potrace in a Web Worker**: high quality vectorization but requires a worker setup and adds ~300KB to the bundle; deferred to V2
- **ImageTracer.js**: pure-JS bitmap tracer; evaluated but produces lower-quality output than the Canvas approach for binary images
- **OpenCV.js**: very high quality but ~30MB WASM binary; not justified for V1

## Consequences

- **Positive**: No extra bundle size; no Worker setup required
- **Positive**: Adjustable threshold parameter gives users direct control over tracing sensitivity
- **Negative**: Lower quality for complex images with fine detail
- **Negative**: May produce jagged outlines on diagonal edges

## V2 upgrade path

Replace `CanvasImageTracer` (implements `IImageTracer`) with `PotraceWorkerTracer` that runs Potrace inside a Web Worker. No application or domain code changes required. Add a note in [V2_ROADMAP.md](../V2_ROADMAP.md) when this becomes a quality concern.
