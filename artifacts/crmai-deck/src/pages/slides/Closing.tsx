export default function Closing() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1B3B2F 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">11 / Closing</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">11 / 11</span>
      </div>

      <div className="absolute left-[6vw] top-[26vh] right-[6vw]">
        <div className="flex items-center gap-[1.5vw] mb-[3vh]">
          <div className="h-[0.25vh] w-[5vw] bg-accent" />
          <span className="font-body text-[1.2vw] uppercase tracking-[0.3em] text-accent font-semibold">Built for arbormind.in</span>
        </div>
        <h2 className="font-display font-bold text-[7vw] leading-[0.95] tracking-tighter text-primary" style={{ textWrap: "balance" }}>
          One workspace. Every customer.
        </h2>
      </div>

      <div className="absolute left-[6vw] top-[68vh] right-[6vw] grid grid-cols-3 gap-[2vw]">
        <div className="border-t border-primary pt-[1.5vh]">
          <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">Live today</span>
          <p className="mt-[1vh] font-body text-[1.4vw] leading-snug text-text">All 5 modules, email send + tracking, AI assistant.</p>
        </div>
        <div className="border-t border-primary pt-[1.5vh]">
          <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">Next up</span>
          <p className="mt-[1vh] font-body text-[1.4vw] leading-snug text-text">Inbound IMAP threading hardening, AI summaries, light-mode polish.</p>
        </div>
        <div className="border-t border-primary pt-[1.5vh]">
          <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">Stack</span>
          <p className="mt-[1vh] font-body text-[1.4vw] leading-snug text-text">React, Vite, Express, Postgres, Drizzle, nodemailer, imapflow.</p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[6vw] right-[6vw] flex items-end justify-between">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-primary" />
          <span className="font-display font-bold text-[1.5vw] tracking-tight text-primary">ArborMind</span>
        </div>
        <span className="font-body text-[1.1vw] text-muted">v1.0 &middot; May 2026 &middot; arbormind.in</span>
      </div>
    </div>
  );
}
