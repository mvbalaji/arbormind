/**
 * Public webhook receivers for social media platforms.
 *
 * All routes are intentionally PUBLIC (no auth guard) — platforms call them
 * server-to-server with their own signature / challenge-based verification.
 *
 * Supported platforms:
 *   POST /api/webhooks/meta        — Facebook & Instagram (Meta)
 *   GET  /api/webhooks/meta        — Meta webhook verification challenge
 *   POST /api/webhooks/linkedin    — LinkedIn webhook events
 *   GET  /api/webhooks/linkedin    — LinkedIn challenge verification
 *   POST /api/webhooks/telegram    — Telegram Bot API updates
 *   POST /api/webhooks/whatsapp    — WhatsApp Business API messages
 *   GET  /api/webhooks/whatsapp    — WhatsApp challenge verification
 */

import { Router, type IRouter } from "express";
import { db, campaignEngagementsTable, leadsTable, campaignsTable, EVENT_SCORES, scoreToCategory } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveLeadByEmail(email: string): Promise<number | null> {
  const rows = await db.select({ id: leadsTable.id })
    .from(leadsTable)
    .where(ilike(leadsTable.email, email))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function resolveCampaignByUtm(utmCampaign: string): Promise<number | null> {
  const rows = await db.select({ id: campaignsTable.id })
    .from(campaignsTable)
    .where(ilike(campaignsTable.name, `%${utmCampaign}%`))
    .limit(1);
  return rows[0]?.id ?? null;
}

type EventType = keyof typeof EVENT_SCORES;

async function recordEngagement(params: {
  platform: string;
  eventType: EventType;
  campaignId?: number | null;
  leadId?: number | null;
  platformUserId?: string | null;
  platformUserName?: string | null;
  platformUserEmail?: string | null;
  platformUserPhone?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  metadata?: Record<string, unknown>;
  rawPayload?: unknown;
  occurredAt?: Date;
}) {
  const score = EVENT_SCORES[params.eventType] ?? 1;
  const category = scoreToCategory(score);
  await db.insert(campaignEngagementsTable).values({
    campaignId: params.campaignId ?? null,
    platform: params.platform,
    eventType: params.eventType,
    engagementScore: score,
    interestCategory: category,
    leadId: params.leadId ?? null,
    platformUserId: params.platformUserId ?? null,
    platformUserName: params.platformUserName ?? null,
    platformUserEmail: params.platformUserEmail ?? null,
    platformUserPhone: params.platformUserPhone ?? null,
    utmSource: params.utmSource ?? params.platform,
    utmMedium: params.utmMedium ?? "social",
    utmCampaign: params.utmCampaign ?? null,
    utmContent: params.utmContent ?? null,
    utmTerm: params.utmTerm ?? null,
    metadata: params.metadata ?? null,
    rawPayload: params.rawPayload as Record<string, unknown> ?? null,
    occurredAt: params.occurredAt ?? new Date(),
  });
}

// ─── Meta (Facebook + Instagram) ─────────────────────────────────────────────

// GET — Meta sends a challenge to verify your webhook endpoint
router.get("/webhooks/meta", (req, res) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "arbormind_meta_verify";
  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

// POST — Meta delivers events (messages, reactions, Lead Ads form fills, etc.)
router.post("/webhooks/meta", async (req, res) => {
  // Signature check (optional but recommended in production)
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = req.headers["x-hub-signature-256"] as string ?? "";
    const expected = "sha256=" + crypto
      .createHmac("sha256", appSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  res.status(200).send("EVENT_RECEIVED"); // Respond quickly — Meta retries if you're slow

  try {
    const body = req.body as {
      object?: string;
      entry?: Array<{
        id: string;
        time?: number;
        messaging?: Array<{
          sender?: { id: string };
          message?: { text?: string };
        }>;
        changes?: Array<{
          value?: {
            verb?: string;
            item?: string;
            comment_text?: string;
            reaction_type?: string;
            leadgen_id?: string;
            field_data?: Array<{ name: string; values: string[] }>;
            from?: { id: string; name?: string };
          };
          field?: string;
        }>;
      }>;
    };

    const platform = body.object === "instagram" ? "instagram" : "facebook";

    for (const entry of body.entry ?? []) {
      const occurredAt = new Date((entry.time ?? 0) * 1000 || Date.now());

      // Messenger messages
      for (const msg of entry.messaging ?? []) {
        const userId = msg.sender?.id;
        await recordEngagement({
          platform,
          eventType: "message",
          platformUserId: userId ?? null,
          rawPayload: msg,
          occurredAt,
        });
      }

      // Page / post events
      for (const change of entry.changes ?? []) {
        const val = change.value ?? {};
        const field = change.field ?? "";
        let eventType: EventType = "view";

        if (field === "leadgen") {
          // Facebook Lead Ad form submission — highest intent signal
          eventType = "form_submit";
          const fieldData = val.field_data ?? [];
          const emailField = fieldData.find((f) => f.name === "email");
          const nameField = fieldData.find((f) => f.name === "full_name" || f.name === "first_name");
          const email = emailField?.values?.[0] ?? null;
          const name = nameField?.values?.[0] ?? null;
          let leadId: number | null = null;
          if (email) leadId = await resolveLeadByEmail(email);
          await recordEngagement({
            platform,
            eventType,
            leadId,
            platformUserName: name,
            platformUserEmail: email,
            rawPayload: change,
            occurredAt,
          });
          continue;
        }

        if (val.item === "comment" || val.verb === "add" && val.comment_text) eventType = "comment";
        else if (val.item === "reaction" || val.reaction_type) eventType = "reaction";
        else if (val.item === "share") eventType = "share";

        await recordEngagement({
          platform,
          eventType,
          platformUserId: val.from?.id ?? null,
          platformUserName: val.from?.name ?? null,
          metadata: { verb: val.verb, item: val.item },
          rawPayload: change,
          occurredAt,
        });
      }
    }
  } catch (err) {
    req.log?.error?.(err);
  }
});

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

router.get("/webhooks/linkedin", (req, res) => {
  // LinkedIn uses a challengeCode query param
  const challenge = req.query.challengeCode as string;
  if (challenge) {
    res.status(200).json({ challengeCode: challenge });
  } else {
    res.status(200).send("OK");
  }
});

router.post("/webhooks/linkedin", async (req, res) => {
  res.status(200).send("OK");

  try {
    const body = req.body as {
      events?: Array<{
        eventType?: string;
        actor?: { id?: string; localizedName?: string };
        object?: { id?: string };
        created?: { time?: number };
      }>;
    };

    for (const event of body.events ?? []) {
      const liEventType = (event.eventType ?? "").toLowerCase();
      let eventType: EventType = "view";

      if (liEventType.includes("share") || liEventType.includes("reshare")) eventType = "share";
      else if (liEventType.includes("comment")) eventType = "comment";
      else if (liEventType.includes("reaction") || liEventType.includes("like")) eventType = "reaction";
      else if (liEventType.includes("follow")) eventType = "profile_visit";
      else if (liEventType.includes("click")) eventType = "link_click";
      else if (liEventType.includes("impression")) eventType = "ad_impression";

      await recordEngagement({
        platform: "linkedin",
        eventType,
        platformUserId: event.actor?.id ?? null,
        platformUserName: event.actor?.localizedName ?? null,
        rawPayload: event,
        occurredAt: event.created?.time ? new Date(event.created.time) : new Date(),
      });
    }
  } catch (err) {
    req.log?.error?.(err);
  }
});

// ─── Telegram ─────────────────────────────────────────────────────────────────

router.post("/webhooks/telegram", async (req, res) => {
  res.status(200).send("OK");

  try {
    const update = req.body as {
      message?: {
        from?: { id?: number; username?: string; first_name?: string; last_name?: string };
        text?: string;
        date?: number;
      };
      callback_query?: {
        from?: { id?: number; username?: string; first_name?: string };
        data?: string;
      };
      channel_post?: { text?: string; date?: number };
    };

    if (update.message) {
      const msg = update.message;
      const from = msg.from;
      const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || null;
      await recordEngagement({
        platform: "telegram",
        eventType: "message",
        platformUserId: from?.id?.toString() ?? null,
        platformUserName: name,
        metadata: { text: msg.text?.slice(0, 200) },
        rawPayload: update,
        occurredAt: msg.date ? new Date(msg.date * 1000) : new Date(),
      });
    } else if (update.callback_query) {
      const from = update.callback_query.from;
      await recordEngagement({
        platform: "telegram",
        eventType: "button_click",
        platformUserId: from?.id?.toString() ?? null,
        platformUserName: from?.first_name ?? from?.username ?? null,
        metadata: { data: update.callback_query.data },
        rawPayload: update,
      });
    }
  } catch (err) {
    req.log?.error?.(err);
  }
});

// ─── WhatsApp Business API ────────────────────────────────────────────────────

router.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? process.env.META_WEBHOOK_VERIFY_TOKEN ?? "arbormind_wa_verify";
  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

router.post("/webhooks/whatsapp", async (req, res) => {
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from?: string;
              type?: string;
              timestamp?: string;
              text?: { body?: string };
            }>;
            contacts?: Array<{
              profile?: { name?: string };
              wa_id?: string;
            }>;
            statuses?: Array<{ status?: string }>;
          };
        }>;
      }>;
    };

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const msg of value.messages ?? []) {
          const contact = value.contacts?.find((c) => c.wa_id === msg.from);
          const name = contact?.profile?.name ?? null;
          const phone = msg.from ?? null;
          const eventType: EventType = msg.type === "interactive" ? "button_click" : "message";

          await recordEngagement({
            platform: "whatsapp",
            eventType,
            platformUserId: phone,
            platformUserName: name,
            platformUserPhone: phone,
            metadata: { type: msg.type, text: msg.text?.body?.slice(0, 200) },
            rawPayload: msg,
            occurredAt: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000) : new Date(),
          });
        }
      }
    }
  } catch (err) {
    req.log?.error?.(err);
  }
});

export default router;
