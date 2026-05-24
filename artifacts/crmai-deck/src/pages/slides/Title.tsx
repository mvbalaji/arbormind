export default function Title() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1B3B2F 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-primary" />
          <span className="font-display font-bold text-[1.5vw] tracking-tight text-primary">ArborMind</span>
        </div>
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-muted">Internal Briefing</span>
      </div>

      <div className="absolute left-[6vw] top-[36vh] right-[6vw]">
        <div className="flex items-center gap-[1.5vw] mb-[3vh]">
          <div className="h-[0.25vh] w-[5vw] bg-accent" />
          <span className="font-body text-[1.2vw] uppercase tracking-[0.3em] text-accent font-semibold">v1.0 / May 2026</span>
        </div>
        <h1 className="font-display font-bold text-[8vw] leading-[0.95] tracking-tighter text-primary" style={{ textWrap: "balance" }}>
          ArborMind CRM
        </h1>
        <p className="mt-[3vh] font-body font-light text-[2.2vw] leading-snug text-text/80 max-w-[70vw]" style={{ textWrap: "balance" }}>
          Sales pipeline, customer data, and AI assistance for arbormind.in.
        </p>
      </div>

      <div className="absolute bottom-[6vh] left-[6vw] right-[6vw] flex items-end justify-between">
        <span className="font-body text-[1.1vw] text-muted max-w-[40vw]">
          A unified workspace for leads, opportunities, quotes, and customer communication.
        </span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">01 / 11</span>
      </div>
    </div>
  );
}
