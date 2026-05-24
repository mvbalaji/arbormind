export default function EndToEndFlow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">08 / Process</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">08 / 09</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">End-to-end flow</h2>
        <p className="mt-[2vh] font-body text-[1.5vw] leading-snug text-muted max-w-[70vw]">From first inbound touch to a closed deal &mdash; with every activity retained on the account.</p>
      </div>

      <div className="absolute left-[6vw] top-[50vh] right-[6vw]">
        <svg viewBox="0 0 1600 280" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <line x1="100" y1="80" x2="1500" y2="80" stroke="#D9D2C6" strokeWidth="2" />

          <circle cx="100" cy="80" r="16" fill="#1B3B2F" />
          <text x="100" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">1</text>
          <text x="100" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Capture</text>
          <text x="100" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Lead created</text>

          <circle cx="300" cy="80" r="16" fill="#1B3B2F" />
          <text x="300" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">2</text>
          <text x="300" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Qualify</text>
          <text x="300" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Note / call / meeting</text>

          <circle cx="500" cy="80" r="16" fill="#1B3B2F" />
          <text x="500" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">3</text>
          <text x="500" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Convert</text>
          <text x="500" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Account + contact + opp</text>

          <circle cx="700" cy="80" r="16" fill="#C97B3E" />
          <text x="700" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">4</text>
          <text x="700" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Discovery</text>
          <text x="700" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Stage progression</text>

          <circle cx="900" cy="80" r="16" fill="#C97B3E" />
          <text x="900" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">5</text>
          <text x="900" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Proposal</text>
          <text x="900" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Quote generated</text>

          <circle cx="1100" cy="80" r="16" fill="#C97B3E" />
          <text x="1100" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">6</text>
          <text x="1100" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Send</text>
          <text x="1100" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Quote email, tracked</text>

          <circle cx="1300" cy="80" r="16" fill="#1B3B2F" />
          <text x="1300" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">7</text>
          <text x="1300" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Negotiate</text>
          <text x="1300" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Replies thread back</text>

          <circle cx="1500" cy="80" r="16" fill="#1B3B2F" />
          <text x="1500" y="85" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="#F4F1EC">8</text>
          <text x="1500" y="135" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Close</text>
          <text x="1500" y="160" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Won / lost &middot; history kept</text>

          <text x="100" y="225" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157" letterSpacing="2">PRE-SALES</text>
          <text x="900" y="225" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#C97B3E" letterSpacing="2">ACTIVE DEAL</text>
          <text x="1500" y="225" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157" letterSpacing="2">POST-SALE</text>
        </svg>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
