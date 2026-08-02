import { Router } from "express";
import { db, enquiriesTable, insertEnquirySchema } from "@workspace/db";
import { getDefaultOrgId } from "../lib/org-context";

const router = Router();

// Public, unauthenticated endpoint (landing page contact form) — no req.orgId,
// so it routes to the Default Organization until per-org public forms exist.
router.post("/enquiries", async (req, res) => {
  try {
    const parsed = insertEnquirySchema.parse(req.body);
    const [enquiry] = await db
      .insert(enquiriesTable)
      .values({ ...parsed, orgId: await getDefaultOrgId() })
      .returning();
    res.status(201).json({ success: true, enquiry });
    return;
  } catch (err) {
    console.error("Enquiry submission error:", err);
    res.status(400).json({ error: "Failed to submit enquiry" });
    return;
  }
});

export default router;
