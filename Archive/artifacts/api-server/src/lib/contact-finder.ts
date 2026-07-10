/**
 * contact-finder.ts
 * Scrapes company website pages (team, about, contact) to extract real people,
 * then uses GPT-4o to parse them into structured contacts.
 * Emails are ONLY returned if literally visible in the scraped text — never inferred.
 */

export interface FoundContact {
  firstName: string;
  lastName: string;
  title: string;
  email: string | null;       // null means "not found publicly" — do NOT fabricate
  phone: string | null;
  linkedinUrl: string | null;
  source: string;             // which page this was found on
  confidence: "high" | "medium" | "low";
}

/* ── Scrape a single URL, return plain text ── */
async function fetchPageText(url: string, timeoutMs = 7000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ArborMindBot/1.0)",
        "Accept": "text/html",
      },
    }).finally(() => clearTimeout(t));

    if (!res.ok) return null;
    const html = await res.text();

    // Strip scripts / styles / tags → plain text
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);   // keep context window manageable
  } catch {
    return null;
  }
}

/* ── Extract social links from raw HTML ── */
function extractLinkedInProfiles(html: string): string[] {
  const matches = html.matchAll(/href=["'](https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?)[^"']*/gi);
  return [...new Set([...matches].map(m => m[1]))];
}

/* ── Try candidate paths for a given base URL ── */
async function scrapeCompanyPages(baseUrl: string): Promise<{ text: string; linkedinProfiles: string[]; pagesFound: string[] }> {
  let origin = baseUrl.trim();
  if (!origin.startsWith("http")) origin = `https://${origin}`;
  try { origin = new URL(origin).origin; } catch { return { text: "", linkedinProfiles: [], pagesFound: [] }; }

  const candidates = [
    "/team", "/our-team", "/about/team", "/about-us/team",
    "/leadership", "/about/leadership",
    "/about", "/about-us",
    "/people", "/company/team",
    "/contact", "/contact-us",
  ];

  const parts: string[] = [];
  const linkedinProfiles: string[] = [];
  const pagesFound: string[] = [];

  // Also fetch the homepage to grab social links from footer
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const homeRes = await fetch(origin, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; ArborMindBot/1.0)", Accept: "text/html" } }).finally(() => clearTimeout(t));
    if (homeRes.ok) {
      const homeHtml = await homeRes.text();
      extractLinkedInProfiles(homeHtml).forEach(u => linkedinProfiles.push(u));
    }
  } catch { /* ignore */ }

  // Try each candidate path in parallel (max 6 concurrent)
  const results = await Promise.allSettled(
    candidates.slice(0, 6).map(async (path) => {
      const url = `${origin}${path}`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ArborMindBot/1.0)", Accept: "text/html" },
          redirect: "follow",
        }).finally(() => clearTimeout(t));

        if (!res.ok) return null;
        const html = await res.text();
        extractLinkedInProfiles(html).forEach(u => linkedinProfiles.push(u));

        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);

        return { path, text };
      } catch {
        return null;
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      parts.push(`[Page: ${r.value.path}]\n${r.value.text}`);
      pagesFound.push(r.value.path);
    }
  }

  return {
    text: parts.join("\n\n").slice(0, 12000),
    linkedinProfiles: [...new Set(linkedinProfiles)].slice(0, 10),
    pagesFound,
  };
}

/* ── GPT-4o contact extraction ── */
export async function findContactsFromWebsite(params: {
  websiteUrl: string;
  companyName: string;
  domain: string;
}): Promise<{ contacts: FoundContact[]; pagesScraped: string[] }> {
  const { websiteUrl, companyName, domain } = params;

  const { text, linkedinProfiles, pagesFound } = await scrapeCompanyPages(websiteUrl);

  if (!text && linkedinProfiles.length === 0) {
    return { contacts: [], pagesScraped: [] };
  }

  const { openai } = await import("@workspace/integrations-openai-ai-server");

  const linkedinSection = linkedinProfiles.length > 0
    ? `\n\nLinkedIn profile URLs found on the site:\n${linkedinProfiles.join("\n")}`
    : "";

  const prompt = `You are extracting real contacts from a company website for a B2B sales team.
Company: ${companyName}
Domain: ${domain}

SCRAPED PAGE CONTENT:
${text || "(no text scraped)"}
${linkedinSection}

TASK: Extract up to 8 real people from the scraped content above. Focus on decision-makers: C-suite, VPs, Directors, Heads of departments.

CRITICAL RULES:
- Only return people whose name is EXPLICITLY mentioned in the scraped text or LinkedIn URLs above.
- For email: ONLY include if an email address is literally visible in the scraped text (e.g. "john@company.com"). If not visible, return null — do NOT guess or construct emails.
- For phone: ONLY include if literally visible in the scraped text. Otherwise null.
- For linkedinUrl: use the LinkedIn profile URLs found above if you can match them to a person by name.
- firstName and lastName must be real names from the text, not placeholders.
- confidence: "high" if name+title clearly on a team/about page, "medium" if mentioned in text, "low" if inferred from LinkedIn URL only.

Return ONLY valid JSON array (no markdown):
[
  {
    "firstName": "string",
    "lastName": "string",
    "title": "string or empty string if unknown",
    "email": "string or null",
    "phone": "string or null",
    "linkedinUrl": "string or null",
    "source": "team page | about page | contact page | linkedin",
    "confidence": "high | medium | low"
  }
]

If no real people are found in the scraped content, return an empty array: []`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { contacts: [], pagesScraped: pagesFound };
    }

    // Handle both {contacts:[...]} and [...] shapes
    let arr: unknown[] = [];
    if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && typeof parsed === "object" && "contacts" in parsed && Array.isArray((parsed as Record<string, unknown>).contacts)) {
      arr = (parsed as Record<string, unknown>).contacts as unknown[];
    } else if (parsed && typeof parsed === "object") {
      // try first array value
      const firstArr = Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v));
      if (firstArr) arr = firstArr as unknown[];
    }

    const contacts: FoundContact[] = arr
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .filter(c => typeof c.firstName === "string" && c.firstName.trim() && typeof c.lastName === "string")
      .map(c => ({
        firstName: String(c.firstName).trim(),
        lastName: String(c.lastName).trim(),
        title: typeof c.title === "string" ? c.title.trim() : "",
        email: typeof c.email === "string" && c.email.includes("@") ? c.email.trim() : null,
        phone: typeof c.phone === "string" && c.phone.trim() ? c.phone.trim() : null,
        linkedinUrl: typeof c.linkedinUrl === "string" && c.linkedinUrl.includes("linkedin") ? c.linkedinUrl.trim() : null,
        source: typeof c.source === "string" ? c.source : "website",
        confidence: (c.confidence === "high" || c.confidence === "medium" || c.confidence === "low") ? (c.confidence as "high" | "medium" | "low") : "low",
      }))
      .slice(0, 8);

    return { contacts, pagesScraped: pagesFound };
  } catch {
    return { contacts: [], pagesScraped: pagesFound };
  }
}
