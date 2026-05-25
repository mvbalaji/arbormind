export default function EndToEndFlow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">10 / Process</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">10 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">End-to-end flow</h2>
        <p className="mt-[2vh] font-body text-[1.5vw] leading-snug text-muted max-w-[70vw]">From first inbound touch through quote, approval, and fulfilled order &mdash; with every activity retained on the account.</p>
      </div>

      <div className="absolute left-[6vw] top-[55vh] right-[6vw]">
        <svg viewBox="0 0 1600 240" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <line x1="80" y1="60" x2="1520" y2="60" stroke="#D9D2C6" strokeWidth="2" />

          <circle cx="80" cy="60" r="15" fill="#1B3B2F" />
          <text x="80" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">1</text>
          <text x="80" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Capture</text>
          <text x="80" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Lead created</text>

          <circle cx="240" cy="60" r="15" fill="#1B3B2F" />
          <text x="240" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">2</text>
          <text x="240" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Qualify</text>
          <text x="240" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Note / call / meeting</text>

          <circle cx="400" cy="60" r="15" fill="#1B3B2F" />
          <text x="400" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">3</text>
          <text x="400" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Convert</text>
          <text x="400" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Account + contact + opp</text>

          <circle cx="560" cy="60" r="15" fill="#1B3B2F" />
          <text x="560" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">4</text>
          <text x="560" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Discovery</text>
          <text x="560" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Stage progression</text>

          <circle cx="720" cy="60" r="15" fill="#C97B3E" />
          <text x="720" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">5</text>
          <text x="720" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Quote</text>
          <text x="720" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Line items, totals (GBP)</text>

          <circle cx="880" cy="60" r="15" fill="#C97B3E" />
          <text x="880" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">6</text>
          <text x="880" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Approve</text>
          <text x="880" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Tiered approval routed</text>

          <circle cx="1040" cy="60" r="15" fill="#C97B3E" />
          <text x="1040" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">7</text>
          <text x="1040" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Send</text>
          <text x="1040" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Tracked email + PDF</text>

          <circle cx="1200" cy="60" r="15" fill="#C97B3E" />
          <text x="1200" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">8</text>
          <text x="1200" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Accept</text>
          <text x="1200" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Customer confirms quote</text>

          <circle cx="1360" cy="60" r="15" fill="#1B3B2F" />
          <text x="1360" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">9</text>
          <text x="1360" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Order</text>
          <text x="1360" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Auto-created, fulfilment</text>

          <circle cx="1520" cy="60" r="15" fill="#1B3B2F" />
          <text x="1520" y="65" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13" fill="#F4F1EC">10</text>
          <text x="1520" y="110" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="17" fill="#1B3B2F">Close</text>
          <text x="1520" y="132" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">Invoiced &middot; paid</text>

          <text x="240" y="190" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157" letterSpacing="2">PRE-SALES</text>
          <text x="880" y="190" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#C97B3E" letterSpacing="2">ACTIVE DEAL</text>
          <text x="1440" y="190" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157" letterSpacing="2">FULFILMENT</text>
        </svg>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
