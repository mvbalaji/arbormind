export default function DataModel() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">09 / Schema</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">09 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">Data model</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-12 gap-[2.5vw] items-start">
        <div className="col-span-5">
          <p className="font-body text-[1.3vw] leading-snug text-text mb-[1.3vh]"><span className="font-semibold text-primary">Leads</span> convert into Accounts + Contacts + an Opportunity.</p>
          <p className="font-body text-[1.3vw] leading-snug text-text mb-[1.3vh]"><span className="font-semibold text-primary">Opportunities</span> own Quotes (1:N) and Activities (1:N).</p>
          <p className="font-body text-[1.3vw] leading-snug text-text mb-[1.3vh]"><span className="font-semibold text-primary">Quotes</span> generate Orders on acceptance (1:1).</p>
          <p className="font-body text-[1.3vw] leading-snug text-text mb-[1.3vh]"><span className="font-semibold text-primary">Approvals</span> attach to quotes and orders for governance.</p>
          <p className="font-body text-[1.3vw] leading-snug text-text mb-[1.3vh]"><span className="font-semibold text-primary">Activities</span> are polymorphic &mdash; attachable to any record.</p>
          <p className="font-body text-[1.3vw] leading-snug text-text"><span className="font-semibold text-primary">EmailTracking</span> rows attach to email activities for open metrics.</p>
        </div>

        <div className="col-span-7">
          <svg viewBox="0 0 700 420" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="20" width="150" height="58" fill="#1B3B2F" />
            <text x="95" y="46" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#F4F1EC">Lead</text>
            <text x="95" y="66" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#F4F1EC" opacity="0.75">qualify -&gt; convert</text>

            <line x1="170" y1="49" x2="240" y2="49" stroke="#C97B3E" strokeWidth="2" />
            <polygon points="240,44 250,49 240,54" fill="#C97B3E" />
            <text x="205" y="40" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">converts</text>

            <rect x="250" y="20" width="150" height="58" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="325" y="46" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Account</text>
            <text x="325" y="66" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">company</text>

            <line x1="400" y1="49" x2="470" y2="49" stroke="#1B3B2F" strokeWidth="2" />
            <text x="435" y="40" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">1 : N</text>
            <rect x="470" y="20" width="150" height="58" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="545" y="46" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Contact</text>
            <text x="545" y="66" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">person at account</text>

            <line x1="325" y1="78" x2="325" y2="130" stroke="#1B3B2F" strokeWidth="2" />
            <text x="340" y="108" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">1 : N</text>
            <rect x="250" y="130" width="150" height="58" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="325" y="156" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Opportunity</text>
            <text x="325" y="176" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">stage, value (GBP)</text>

            <line x1="400" y1="159" x2="470" y2="159" stroke="#1B3B2F" strokeWidth="2" />
            <text x="435" y="150" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">1 : N</text>
            <rect x="470" y="130" width="150" height="58" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="545" y="156" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Quote</text>
            <text x="545" y="176" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">line items, totals</text>

            <line x1="545" y1="188" x2="545" y2="230" stroke="#1B3B2F" strokeWidth="2" />
            <polygon points="540,230 545,240 550,230" fill="#1B3B2F" />
            <text x="560" y="215" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">on accept</text>
            <rect x="470" y="240" width="150" height="58" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="545" y="266" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Order</text>
            <text x="545" y="286" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">fulfilment, invoiced</text>

            <line x1="470" y1="159" x2="410" y2="265" stroke="#C97B3E" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="470" y1="265" x2="410" y2="265" stroke="#C97B3E" strokeWidth="1.5" strokeDasharray="4 4" />
            <rect x="250" y="240" width="150" height="58" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="325" y="266" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Approval</text>
            <text x="325" y="286" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">tier, status, audit</text>

            <line x1="325" y1="188" x2="325" y2="240" stroke="#C97B3E" strokeWidth="1.5" strokeDasharray="4 4" />

            <line x1="325" y1="298" x2="325" y2="335" stroke="#C97B3E" strokeWidth="2" strokeDasharray="6 4" />
            <text x="340" y="320" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">polymorphic</text>
            <rect x="250" y="345" width="150" height="58" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="325" y="371" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Activity</text>
            <text x="325" y="391" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">note, call, email...</text>

            <line x1="400" y1="374" x2="470" y2="374" stroke="#C97B3E" strokeWidth="2" />
            <text x="435" y="365" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill="#6B6157">1 : 1</text>
            <rect x="470" y="345" width="160" height="58" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="550" y="371" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="15" fill="#1B3B2F">EmailTracking</text>
            <text x="550" y="391" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">opens, IP, ua</text>

            <line x1="95" y1="78" x2="95" y2="370" stroke="#C97B3E" strokeWidth="1.2" strokeDasharray="4 4" />
            <line x1="95" y1="370" x2="250" y2="374" stroke="#C97B3E" strokeWidth="1.2" strokeDasharray="4 4" />
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
