export const QUOTE_STAGES = [
  { id: "draft",        label: "Draft",        desc: "Initial draft, not yet submitted" },
  { id: "needs_review", label: "Needs Review", desc: "Submitted for internal review" },
  { id: "in_review",   label: "In Review",    desc: "Being reviewed by manager" },
  { id: "approved",    label: "Approved",     desc: "Internally approved" },
  { id: "presented",   label: "Presented",    desc: "Sent to customer" },
  { id: "accepted",    label: "Accepted",     desc: "Customer accepted" },
  { id: "rejected",    label: "Rejected",     desc: "Customer rejected" },
] as const;

export type QuoteStageId = (typeof QUOTE_STAGES)[number]["id"];

// Stages that appear in the workflow rules UI (excludes Draft which has no inbound trigger)
export const WORKFLOW_STAGES = QUOTE_STAGES.filter(s => s.id !== "draft");
