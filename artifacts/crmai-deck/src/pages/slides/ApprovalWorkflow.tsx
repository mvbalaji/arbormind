export default function ApprovalWorkflow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">05 / Governance</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">05 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">Approval workflow</h2>
        <p className="mt-[2vh] font-body text-[1.5vw] leading-snug text-muted max-w-[70vw]">Threshold-based governance applied to quotes, discounts, and orders before they reach the customer.</p>
      </div>

      <div className="absolute left-[6vw] top-[48vh] right-[6vw] grid grid-cols-12 gap-[2.5vw] items-start">
        <div className="col-span-5">
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">01</span>
            <p className="font-body text-[1.45vw] leading-snug text-text"><span className="font-semibold text-primary">Trigger</span> &mdash; quote submitted, discount over 15%, or order over GBP threshold.</p>
          </div>
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">02</span>
            <p className="font-body text-[1.45vw] leading-snug text-text"><span className="font-semibold text-primary">Route</span> &mdash; tiered approvers selected automatically by deal size.</p>
          </div>
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">03</span>
            <p className="font-body text-[1.45vw] leading-snug text-text"><span className="font-semibold text-primary">Notify</span> &mdash; in-app task plus tracked email to the approver.</p>
          </div>
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">04</span>
            <p className="font-body text-[1.45vw] leading-snug text-text"><span className="font-semibold text-primary">Decide</span> &mdash; approve, reject, or request changes with a required comment.</p>
          </div>
          <div className="flex items-start gap-[1vw]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">05</span>
            <p className="font-body text-[1.45vw] leading-snug text-text"><span className="font-semibold text-primary">Audit</span> &mdash; full trail kept on the record: who, when, why.</p>
          </div>
        </div>

        <div className="col-span-7">
          <div className="border border-line bg-paper/60 p-[1.8vw]">
            <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">Default approval tiers</span>
            <div className="mt-[2vh] grid grid-cols-1 gap-[1.4vh]">
              <div className="flex items-center justify-between border-b border-line pb-[1vh]">
                <span className="font-body text-[1.35vw] text-text">Value up to <span className="tabular-nums font-semibold text-primary">GBP 10,000</span></span>
                <span className="font-display font-bold text-[1.2vw] text-accent uppercase tracking-[0.15em]">Owner sign-off</span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-[1vh]">
                <span className="font-body text-[1.35vw] text-text"><span className="tabular-nums font-semibold text-primary">10,001 &ndash; 50,000</span></span>
                <span className="font-display font-bold text-[1.2vw] text-accent uppercase tracking-[0.15em]">Sales manager</span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-[1vh]">
                <span className="font-body text-[1.35vw] text-text"><span className="tabular-nums font-semibold text-primary">50,001 &ndash; 100,000</span></span>
                <span className="font-display font-bold text-[1.2vw] text-accent uppercase tracking-[0.15em]">Director</span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-[1vh]">
                <span className="font-body text-[1.35vw] text-text">Over <span className="tabular-nums font-semibold text-primary">100,000</span></span>
                <span className="font-display font-bold text-[1.2vw] text-accent uppercase tracking-[0.15em]">CFO</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-[1.35vw] text-text">Discount over <span className="tabular-nums font-semibold text-primary">15%</span></span>
                <span className="font-display font-bold text-[1.2vw] text-accent uppercase tracking-[0.15em]">Sales manager</span>
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
