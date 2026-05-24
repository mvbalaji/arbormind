export default function DataModel() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">07 / Schema</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">07 / 09</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">Data model</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-12 gap-[2.5vw] items-start">
        <div className="col-span-5">
          <p className="font-body text-[1.35vw] leading-snug text-text mb-[1.5vh]"><span className="font-semibold text-primary">Leads</span> convert into Accounts + Contacts + an Opportunity.</p>
          <p className="font-body text-[1.35vw] leading-snug text-text mb-[1.5vh]"><span className="font-semibold text-primary">Opportunities</span> own Quotes (1:N) and Activities (1:N).</p>
          <p className="font-body text-[1.35vw] leading-snug text-text mb-[1.5vh]"><span className="font-semibold text-primary">Accounts</span> own Contacts (1:N) and Opportunities (1:N).</p>
          <p className="font-body text-[1.35vw] leading-snug text-text mb-[1.5vh]"><span className="font-semibold text-primary">Activities</span> are polymorphic &mdash; one record can attach to a lead, opportunity, account, or contact.</p>
          <p className="font-body text-[1.35vw] leading-snug text-text"><span className="font-semibold text-primary">Email tracking</span> rows attach to email-type activities for open metrics.</p>
        </div>

        <div className="col-span-7">
          <svg viewBox="0 0 700 400" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="160" height="70" fill="#1B3B2F" />
            <text x="100" y="60" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#F4F1EC">Lead</text>
            <text x="100" y="82" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#F4F1EC" opacity="0.75">qualify -&gt; convert</text>

            <line x1="180" y1="65" x2="260" y2="65" stroke="#C97B3E" strokeWidth="2" />
            <polygon points="260,60 270,65 260,70" fill="#C97B3E" />
            <text x="220" y="55" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">converts</text>

            <rect x="270" y="30" width="160" height="70" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="350" y="60" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Account</text>
            <text x="350" y="82" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">company record</text>

            <line x1="430" y1="65" x2="510" y2="65" stroke="#1B3B2F" strokeWidth="2" />
            <text x="470" y="55" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">1 : N</text>
            <rect x="510" y="30" width="160" height="70" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="590" y="60" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Contact</text>
            <text x="590" y="82" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">person at account</text>

            <line x1="350" y1="100" x2="350" y2="160" stroke="#1B3B2F" strokeWidth="2" />
            <text x="365" y="135" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">1 : N</text>
            <rect x="270" y="160" width="160" height="70" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="350" y="190" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Opportunity</text>
            <text x="350" y="212" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">stage, value (GBP)</text>

            <line x1="430" y1="195" x2="510" y2="195" stroke="#1B3B2F" strokeWidth="2" />
            <text x="470" y="185" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">1 : N</text>
            <rect x="510" y="160" width="160" height="70" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="590" y="190" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Quote</text>
            <text x="590" y="212" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">line items, totals</text>

            <line x1="350" y1="230" x2="350" y2="290" stroke="#C97B3E" strokeWidth="2" strokeDasharray="6 4" />
            <text x="365" y="265" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">polymorphic</text>
            <rect x="270" y="290" width="160" height="70" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="350" y="320" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Activity</text>
            <text x="350" y="342" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">note, call, email...</text>

            <line x1="430" y1="325" x2="510" y2="325" stroke="#C97B3E" strokeWidth="2" />
            <text x="470" y="315" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">1 : 1</text>
            <rect x="510" y="290" width="170" height="70" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="595" y="320" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="16" fill="#1B3B2F">EmailTracking</text>
            <text x="595" y="342" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">opens, IP, ua</text>

            <line x1="100" y1="100" x2="100" y2="290" stroke="#C97B3E" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="100" y1="290" x2="270" y2="325" stroke="#C97B3E" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
