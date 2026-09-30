// Importing a watch history from another app, and folding one library into
// another — the Android port's data/imports and archive merge, as plain
// TypeScript that runs in the browser and on the server alike.
//
// Run an import against a snapshot of the library to get a plan, show the
// result, then land the plan with `applyImportPlan` wherever the library row
// is saved.

export * from "./types";
export { runUniversalImport, showStatus, movieStatus, describeImportFile } from "./universal";
export { runTvTimeImport, tvTimeRatingScore } from "./tvtime";
export { applyImportPlan } from "./apply";
export { chooseImportRoute, type ImportRoute } from "./route";
export { mergeArchives, pruneArchive, MERGED_VERSION } from "./merge";
export { diagnosticsReport, readTvTimeFiles } from "./tvtime-reader";
