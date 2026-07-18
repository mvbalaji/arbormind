export default function Multitenant() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      {/* Header label */}
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">13 / Multitenant</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">13 / 13</span>
      </div>

      {/* Title */}
      <div className="absolute left-[6vw] top-[12vh] right-[55vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] tracking-tight text-primary">Multitenant<br />architecture</h2>
        <p className="font-body text-[1.45vw] leading-snug text-muted mt-[2.5vh]" style={{textWrap: "pretty"}}>One shared platform, fully isolated per organisation — enforced at every query via <span className="font-semibold text-primary">org_id</span>.</p>
      </div>

      {/* Three key points */}
      <div className="absolute left-[6vw] top-[60vh] right-[55vw] flex flex-col gap-[2vh]">
        <div className="flex items-start gap-[1.2vw]">
          <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.3vh]">01</span>
          <p className="font-body text-[1.35vw] leading-snug text-text"><span className="font-semibold text-primary">Data isolation</span> — 12 core tables carry <span className="text-accent font-semibold">org_id</span>; all API queries filter by the session org.</p>
        </div>
        <div className="flex items-start gap-[1.2vw]">
          <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.3vh]">02</span>
          <p className="font-body text-[1.35vw] leading-snug text-text"><span className="font-semibold text-primary">Access control</span> — <span className="text-accent font-semibold">allowed_users</span> maps users to orgs; login resolves the correct tenant.</p>
        </div>
        <div className="flex items-start gap-[1.2vw]">
          <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.3vh]">03</span>
          <p className="font-body text-[1.35vw] leading-snug text-text"><span className="font-semibold text-primary">Shared infra</span> — single Postgres database, single API, zero cross-tenant leakage by design.</p>
        </div>
      </div>

      {/* SVG diagram */}
      <div className="absolute right-[4vw] top-[10vh] bottom-[8vh] w-[48vw] flex items-center">
        <svg viewBox="0 0 620 480" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">

          {/* ── Org A tenant box ── */}
          <rect x="20" y="20" width="168" height="148" rx="6" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2"/>
          <rect x="20" y="20" width="168" height="30" rx="6" fill="#1B3B2F"/>
          <rect x="20" y="38" width="168" height="12" fill="#1B3B2F"/>
          <text x="104" y="40" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">Org A</text>
          <text x="44" y="80" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#1B3B2F">Users (org_id = 1)</text>
          <text x="44" y="100" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#1B3B2F">Accounts (org_id = 1)</text>
          <text x="44" y="120" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#1B3B2F">Leads, Opps, Quotes…</text>
          <text x="44" y="140" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#C97B3E" fontWeight="600">12 tables scoped</text>

          {/* ── Org B tenant box ── */}
          <rect x="226" y="20" width="168" height="148" rx="6" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2"/>
          <rect x="226" y="20" width="168" height="30" rx="6" fill="#1B3B2F"/>
          <rect x="226" y="38" width="168" height="12" fill="#1B3B2F"/>
          <text x="310" y="40" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">Org B</text>
          <text x="250" y="80" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#1B3B2F">Users (org_id = 2)</text>
          <text x="250" y="100" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#1B3B2F">Accounts (org_id = 2)</text>
          <text x="250" y="120" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#1B3B2F">Leads, Opps, Quotes…</text>
          <text x="250" y="140" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#C97B3E" fontWeight="600">12 tables scoped</text>

          {/* ── Org N tenant box (dashed) ── */}
          <rect x="432" y="20" width="168" height="148" rx="6" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" strokeDasharray="6 3"/>
          <text x="516" y="100" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="22" fill="#1B3B2F" opacity="0.3">Org N</text>
          <text x="516" y="126" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">future tenant</text>

          {/* ── Arrows down to allowed_users ── */}
          <line x1="104" y1="168" x2="104" y2="218" stroke="#C97B3E" strokeWidth="2" strokeDasharray="5 3"/>
          <polygon points="100,218 104,228 108,218" fill="#C97B3E"/>
          <line x1="310" y1="168" x2="310" y2="218" stroke="#C97B3E" strokeWidth="2" strokeDasharray="5 3"/>
          <polygon points="306,218 310,228 314,218" fill="#C97B3E"/>

          {/* ── allowed_users table ── */}
          <rect x="160" y="228" width="300" height="54" rx="6" fill="#1B3B2F"/>
          <text x="310" y="250" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="15" fill="#F4F1EC">allowed_users</text>
          <text x="310" y="270" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#F4F1EC" opacity="0.7">user_id  ·  org_id  ·  role  ·  is_active</text>

          {/* ── Arrow down to API ── */}
          <line x1="310" y1="282" x2="310" y2="330" stroke="#1B3B2F" strokeWidth="2"/>
          <polygon points="306,330 310,340 314,330" fill="#1B3B2F"/>

          {/* ── API layer ── */}
          <rect x="120" y="340" width="380" height="56" rx="6" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2"/>
          <text x="310" y="364" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="15" fill="#1B3B2F">Express API</text>
          <text x="310" y="384" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">session resolves org — every query WHERE org_id = session.org</text>

          {/* ── Arrow down to Postgres ── */}
          <line x1="310" y1="396" x2="310" y2="430" stroke="#1B3B2F" strokeWidth="2"/>
          <polygon points="306,430 310,440 314,430" fill="#1B3B2F"/>

          {/* ── Postgres ── */}
          <rect x="170" y="440" width="280" height="36" rx="6" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2"/>
          <text x="310" y="463" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#1B3B2F">PostgreSQL — single shared database</text>

          {/* ── Isolation badge ── */}
          <rect x="460" y="228" width="140" height="54" rx="6" fill="#C97B3E"/>
          <text x="530" y="251" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">Zero cross-tenant</text>
          <text x="530" y="270" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#F4F1EC" opacity="0.85">leakage by design</text>
        </svg>
      </div>

      {/* Footer */}
      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
