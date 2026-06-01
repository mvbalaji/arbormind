---
name: Composite TS project references — rebuild libs after schema/codegen changes
description: Why downstream typechecks see stale types after editing a lib schema or running api-spec codegen, and how to fix.
---

This monorepo uses TypeScript **composite project references**. Artifacts type-check against each referenced library's emitted declaration output (governed by `.tsbuildinfo`), not the library `src` — even though `package.json` `exports` point at `src`.

**Why this matters:** after editing a lib schema (e.g. `lib/db`) or running api-spec codegen (regenerates the generated client lib src), downstream artifact typechecks still report the OLD shape ("Property X does not exist on ...") because the referenced project's emitted declarations are stale. Runtime is unaffected (api-server esbuild bundles lib src; vite resolves src), so the app runs fine while types are stale — which hides the problem until typecheck/CI.

**How to apply:** after any lib schema change or codegen, run the workspace lib build (`tsc --build`, exposed as the `typecheck:libs` script) to regenerate the composite declarations, then re-run the artifact typechecks. Be aware `tsc --build` can exit non-zero from unrelated pre-existing errors in other libs; confirm your own change by grepping the output for your specific symbol.
