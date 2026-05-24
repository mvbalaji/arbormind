export default function CoreModules() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">03 / Features</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">03 / 11</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">Core modules</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-3 gap-x-[2.5vw] gap-y-[4vh]">
        <div className="border-t-2 border-primary pt-[2vh]">
          <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">01</span>
          <h3 className="mt-[1vh] font-display font-bold text-[2vw] leading-tight text-primary">Leads</h3>
          <p className="mt-[1.2vh] font-body text-[1.35vw] leading-snug text-text/85">Inbound capture, qualification, and ownership.</p>
        </div>
        <div className="border-t-2 border-primary pt-[2vh]">
          <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">02</span>
          <h3 className="mt-[1vh] font-display font-bold text-[2vw] leading-tight text-primary">Accounts &amp; Contacts</h3>
          <p className="mt-[1.2vh] font-body text-[1.35vw] leading-snug text-text/85">Company records and the key people inside them.</p>
        </div>
        <div className="border-t-2 border-primary pt-[2vh]">
          <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">03</span>
          <h3 className="mt-[1vh] font-display font-bold text-[2vw] leading-tight text-primary">Opportunities</h3>
          <p className="mt-[1.2vh] font-body text-[1.35vw] leading-snug text-text/85">Stage-based deal pipeline with forecasted value in GBP.</p>
        </div>
        <div className="border-t-2 border-primary pt-[2vh]">
          <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">04</span>
          <h3 className="mt-[1vh] font-display font-bold text-[2vw] leading-tight text-primary">Quotes</h3>
          <p className="mt-[1.2vh] font-body text-[1.35vw] leading-snug text-text/85">Versioned line items, totals in GBP, approvals, send-and-track.</p>
        </div>
        <div className="border-t-2 border-primary pt-[2vh]">
          <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">05</span>
          <h3 className="mt-[1vh] font-display font-bold text-[2vw] leading-tight text-primary">Orders</h3>
          <p className="mt-[1.2vh] font-body text-[1.35vw] leading-snug text-text/85">Created on quote acceptance; tracks fulfilment to invoiced and paid.</p>
        </div>
        <div className="border-t-2 border-primary pt-[2vh]">
          <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">06</span>
          <h3 className="mt-[1vh] font-display font-bold text-[2vw] leading-tight text-primary">Activities</h3>
          <p className="mt-[1.2vh] font-body text-[1.35vw] leading-snug text-text/85">Notes, calls, meetings, tasks, email &mdash; logged per record.</p>
        </div>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
