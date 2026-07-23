import { Router } from "express";
import { db, enquiriesTable, insertEnquirySchema } from "@workspace/db";

const router = Router();

router.post("/enquiries", async (req, res) => {
  try {
    const parsed = insertEnquirySchema.parse(req.body);
    // Public contact-form endpoint — anonymous website visitors have no session,
    // so req.orgId may be undefined. Fall back to the Default Organization
    // (single-tenant marketing site scenario) rather than leaving orgId unset.
    const [enquiry] = await db
      .insert(enquiriesTable)
      .values({ ...parsed, orgId: req.orgId ?? 1 })
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
