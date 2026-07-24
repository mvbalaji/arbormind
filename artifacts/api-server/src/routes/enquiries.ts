import { Router } from "express";
import { db, enquiriesTable, insertEnquirySchema } from "@workspace/db";

const router = Router();

router.post("/enquiries", async (req, res) => {
  try {
    const parsed = insertEnquirySchema.parse(req.body);
    const [enquiry] = await db
      .insert(enquiriesTable)
      .values(parsed)
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
