export default function Overview() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">02 / Overview</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">02 / 09</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary" style={{ textWrap: "balance" }}>
          What ArborMind does
        </h2>
      </div>

      <div className="absolute left-[6vw] top-[42vh] right-[6vw] grid grid-cols-12 gap-[2vw]">
        <div className="col-span-7">
          <div className="flex items-start gap-[1.4vw] mb-[2.5vh]">
            <span className="font-display font-bold text-[1.6vw] text-accent tabular-nums leading-none mt-[0.4vh]">01</span>
            <p className="font-body text-[1.8vw] leading-snug text-text">Captures and qualifies inbound and outbound leads.</p>
          </div>
          <div className="flex items-start gap-[1.4vw] mb-[2.5vh]">
            <span className="font-display font-bold text-[1.6vw] text-accent tabular-nums leading-none mt-[0.4vh]">02</span>
            <p className="font-body text-[1.8vw] leading-snug text-text">Tracks deals end-to-end from first contact to closed-won.</p>
          </div>
          <div className="flex items-start gap-[1.4vw] mb-[2.5vh]">
            <span className="font-display font-bold text-[1.6vw] text-accent tabular-nums leading-none mt-[0.4vh]">03</span>
            <p className="font-body text-[1.8vw] leading-snug text-text">Centralizes accounts, contacts, opportunities, quotes, and activities.</p>
          </div>
          <div className="flex items-start gap-[1.4vw] mb-[2.5vh]">
            <span className="font-display font-bold text-[1.6vw] text-accent tabular-nums leading-none mt-[0.4vh]">04</span>
            <p className="font-body text-[1.8vw] leading-snug text-text">Sends and tracks email directly from each record.</p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <span className="font-display font-bold text-[1.6vw] text-accent tabular-nums leading-none mt-[0.4vh]">05</span>
            <p className="font-body text-[1.8vw] leading-snug text-text">AI assistant suggests next actions and drafts messages.</p>
          </div>
        </div>

        <div className="col-span-5 relative">
          <div className="border border-line bg-paper/60 p-[2.5vw] h-full">
            <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">At a glance</span>
            <div className="mt-[2.5vh] grid grid-cols-2 gap-[1.5vh]">
              <div className="border-t border-line pt-[1.2vh]">
                <div className="font-display font-bold text-[3.2vw] leading-none text-primary tabular-nums">5</div>
                <div className="mt-[0.6vh] font-body text-[1.1vw] text-muted">Core modules</div>
              </div>
              <div className="border-t border-line pt-[1.2vh]">
                <div className="font-display font-bold text-[3.2vw] leading-none text-primary tabular-nums">7</div>
                <div className="mt-[0.6vh] font-body text-[1.1vw] text-muted">AI actions</div>
              </div>
              <div className="border-t border-line pt-[1.2vh]">
                <div className="font-display font-bold text-[3.2vw] leading-none text-primary tabular-nums">2-way</div>
                <div className="mt-[0.6vh] font-body text-[1.1vw] text-muted">Email sync</div>
              </div>
              <div className="border-t border-line pt-[1.2vh]">
                <div className="font-display font-bold text-[3.2vw] leading-none text-primary tabular-nums">GBP</div>
                <div className="mt-[0.6vh] font-body text-[1.1vw] text-muted">Native currency</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
