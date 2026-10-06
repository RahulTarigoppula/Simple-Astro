// A one-line ESM wrapper around the CJS OpenCV.js build, imported dynamically by palm.worker.ts.
//
// Why a wrapper: OpenCV.js's emscripten Module has a `then` method. A direct `await import(cv)`
// goes through the bundler's CJS interop, which returns an object carrying that `then` — the
// promise machinery then adopts it, Module.then resolves with Module, which is adopted again…
// an endless microtask loop that starves the event loop (no timeout can even fire). A *static*
// import here is interop'd synchronously, and the namespace this module exports holds the Module
// in a box, so nothing thenable ever reaches a promise.
import * as cvNamespace from "@techstark/opencv-js";

const ns = cvNamespace as unknown as { default?: unknown };
export const box: { cv: unknown } = { cv: ns.default ?? cvNamespace };
