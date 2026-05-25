export default function AIAssistant() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">07 / Intelligence</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">07 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">AI assistant</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-12 gap-[2.5vw]">
        <div className="col-span-5">
          <p className="font-body text-[1.6vw] leading-snug text-text/90 mb-[2.5vh]">Next-best-action suggestions on every lead and opportunity.</p>
          <p className="font-body text-[1.4vw] leading-snug text-text/80 mb-[1.8vh]">Reads the full record context &mdash; recent activities, owner, stage, value &mdash; before acting.</p>
          <p className="font-body text-[1.4vw] leading-snug text-text/80">Operates inside the same auth and audit trail as a human user.</p>
        </div>

        <div className="col-span-7">
          <div className="border border-line bg-paper/60 p-[2vw]">
            <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">Seven first-class mutation tools</span>
            <div className="mt-[2vh] grid grid-cols-2 gap-x-[2vw] gap-y-[1.4vh]">
              <div className="flex items-center gap-[1vw] border-b border-line pb-[1vh]">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">01</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Create task</span>
              </div>
              <div className="flex items-center gap-[1vw] border-b border-line pb-[1vh]">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">02</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Log call</span>
              </div>
              <div className="flex items-center gap-[1vw] border-b border-line pb-[1vh]">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">03</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Advance stage</span>
              </div>
              <div className="flex items-center gap-[1vw] border-b border-line pb-[1vh]">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">04</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Update owner</span>
              </div>
              <div className="flex items-center gap-[1vw] border-b border-line pb-[1vh]">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">05</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Draft email</span>
              </div>
              <div className="flex items-center gap-[1vw] border-b border-line pb-[1vh]">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">06</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Add note</span>
              </div>
              <div className="flex items-center gap-[1vw] col-span-2">
                <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums">07</span>
                <span className="font-body text-[1.3vw] text-primary font-semibold">Schedule meeting</span>
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
