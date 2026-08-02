/**
 * Registry of CRM entity types the Integration Framework can create/update.
 * Adding a new entity type here (plus a target schema browser entry in the
 * mapping editor) is the only step required to extend inbound mapping to
 * another CRM object — no mapping-engine changes needed.
 */
import { db, leadsTable, contactsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

export interface TargetFieldDescriptor {
  field: string;
  label: string;
  type: "string" | "email" | "phone" | "number" | "boolean";
  required?: boolean;
}

export interface EntityUpsertResult {
  id: number;
  created: boolean;
}

export interface EntityTypeDescriptor {
  key: string;
  label: string;
  dedupeField: string;
  fields: TargetFieldDescriptor[];
  upsert: (mapped: Record<string, unknown>, orgId: number) => Promise<EntityUpsertResult>;
}

async function upsertLead(mapped: Record<string, unknown>, orgId: number): Promise<EntityUpsertResult> {
  const email = typeof mapped.email === "string" ? mapped.email : undefined;
  const values = {
    firstName: String(mapped.firstName ?? "").trim() || "Unknown",
    lastName: String(mapped.lastName ?? "").trim() || "Unknown",
    email: email ?? null,
    phone: typeof mapped.phone === "string" ? mapped.phone : null,
    company: typeof mapped.company === "string" ? mapped.company : null,
    title: typeof mapped.title === "string" ? mapped.title : null,
    source: typeof mapped.source === "string" ? mapped.source : "integration",
    status: typeof mapped.status === "string" ? mapped.status : "new",
    description: typeof mapped.description === "string" ? mapped.description : null,
  };

  if (email) {
    const [existing] = await db.select({ id: leadsTable.id }).from(leadsTable).where(and(eq(leadsTable.email, email), eq(leadsTable.orgId, orgId))).limit(1);
    if (existing) {
      await db.update(leadsTable).set({ ...values, updatedAt: new Date() }).where(eq(leadsTable.id, existing.id));
      return { id: existing.id, created: false };
    }
  }

  const [created] = await db.execute(sql`
    INSERT INTO leads (first_name, last_name, email, phone, company, title, source, status, description, org_id)
    VALUES (${values.firstName}, ${values.lastName}, ${values.email}, ${values.phone}, ${values.company}, ${values.title}, ${values.source}, ${values.status}, ${values.description}, ${orgId})
    RETURNING id
  `).then((r) => r.rows as Array<{ id: number }>);
  return { id: created.id, created: true };
}

async function upsertContact(mapped: Record<string, unknown>, orgId: number): Promise<EntityUpsertResult> {
  const email = typeof mapped.email === "string" ? mapped.email : undefined;
  const values = {
    firstName: String(mapped.firstName ?? "").trim() || "Unknown",
    lastName: String(mapped.lastName ?? "").trim() || "Unknown",
    email: email ?? null,
    phone: typeof mapped.phone === "string" ? mapped.phone : null,
    mobile: typeof mapped.mobile === "string" ? mapped.mobile : null,
    title: typeof mapped.title === "string" ? mapped.title : null,
    department: typeof mapped.department === "string" ? mapped.department : null,
    city: typeof mapped.city === "string" ? mapped.city : null,
    country: typeof mapped.country === "string" ? mapped.country : null,
    description: typeof mapped.description === "string" ? mapped.description : null,
  };

  if (email) {
    const [existing] = await db.select({ id: contactsTable.id }).from(contactsTable).where(and(eq(contactsTable.email, email), eq(contactsTable.orgId, orgId))).limit(1);
    if (existing) {
      await db.update(contactsTable).set({ ...values, updatedAt: new Date() }).where(eq(contactsTable.id, existing.id));
      return { id: existing.id, created: false };
    }
  }

  const [created] = await db.execute(sql`
    INSERT INTO contacts (first_name, last_name, email, phone, mobile, title, department, city, country, description, org_id)
    VALUES (${values.firstName}, ${values.lastName}, ${values.email}, ${values.phone}, ${values.mobile}, ${values.title}, ${values.department}, ${values.city}, ${values.country}, ${values.description}, ${orgId})
    RETURNING id
  `).then((r) => r.rows as Array<{ id: number }>);
  return { id: created.id, created: true };
}

export const ENTITY_TYPES: Record<string, EntityTypeDescriptor> = {
  lead: {
    key: "lead",
    label: "Lead",
    dedupeField: "email",
    fields: [
      { field: "firstName", label: "First Name", type: "string", required: true },
      { field: "lastName", label: "Last Name", type: "string", required: true },
      { field: "email", label: "Email", type: "email" },
      { field: "phone", label: "Phone", type: "phone" },
      { field: "company", label: "Company", type: "string" },
      { field: "title", label: "Job Title", type: "string" },
      { field: "source", label: "Lead Source", type: "string" },
      { field: "status", label: "Status", type: "string" },
      { field: "description", label: "Description", type: "string" },
    ],
    upsert: upsertLead,
  },
  contact: {
    key: "contact",
    label: "Contact",
    dedupeField: "email",
    fields: [
      { field: "firstName", label: "First Name", type: "string", required: true },
      { field: "lastName", label: "Last Name", type: "string", required: true },
      { field: "email", label: "Email", type: "email" },
      { field: "phone", label: "Phone", type: "phone" },
      { field: "mobile", label: "Mobile", type: "phone" },
      { field: "title", label: "Job Title", type: "string" },
      { field: "department", label: "Department", type: "string" },
      { field: "city", label: "City", type: "string" },
      { field: "country", label: "Country", type: "string" },
      { field: "description", label: "Description", type: "string" },
    ],
    upsert: upsertContact,
  },
};

export function getEntityType(key: string): EntityTypeDescriptor | undefined {
  return ENTITY_TYPES[key];
}
