export default function EmailTracking() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">04 / Communication</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">04 / 09</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">Email &amp; tracking</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-2 gap-[3vw]">
        <div>
          <div className="flex items-baseline gap-[1vw] mb-[2vh]">
            <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">01</span>
            <h3 className="font-display font-bold text-[2.4vw] text-primary leading-tight">Outbound</h3>
          </div>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.5vh]">Compose from any lead or opportunity, send via SMTP.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.5vh]">Open tracking: a 1&times;1 pixel attached per send records every open with timestamp, IP, and user agent.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85">Status badges: <span className="font-semibold text-primary">Sent</span> &middot; <span className="font-semibold text-accent">Opened N&times;</span> &middot; <span className="font-semibold text-muted">Not yet opened</span>.</p>
        </div>

        <div>
          <div className="flex items-baseline gap-[1vw] mb-[2vh]">
            <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">02</span>
            <h3 className="font-display font-bold text-[2.4vw] text-primary leading-tight">Inbound</h3>
          </div>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.5vh]">IMAP poller pulls replies on a configurable interval (default 15 min) and threads them to the right record.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.5vh]">Messages attach as activities on the originating lead, opportunity, or contact.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85">Full conversation history visible inline on every record.</p>
        </div>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
