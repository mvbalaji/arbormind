export * from "./generated/api";
export * from "./generated/types";

// For these three names, orval emits a zod schema in `generated/api` *and* a
// TypeScript type of the same name in `generated/types`, so the two `export *`
// above are ambiguous (TS2308). An explicit re-export takes precedence over a
// star export and resolves it — the zod schema wins, since callers of this
// package want the runtime validator. The types remain reachable via
// `@workspace/api-zod/generated/types` if ever needed.
export {
  SendQuoteResponse,
  TerminateContractBody,
  UpdateOpportunityItemsBody,
} from "./generated/api";
