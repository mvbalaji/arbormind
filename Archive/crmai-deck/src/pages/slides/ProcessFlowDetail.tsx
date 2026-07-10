export default function ProcessFlowDetail() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">11 / Detail</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">11 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[13vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2vh]" />
        <h2 className="font-display font-bold text-[3.8vw] leading-[1] tracking-tight text-primary">Process flow &mdash; in detail</h2>
        <p className="mt-[1.4vh] font-body text-[1.2vw] leading-snug text-muted max-w-[80vw]">Every phase broken down by actor, action, and system result. The same record carries through from first touch to invoice.</p>
      </div>

      <div className="absolute left-[6vw] top-[30vh] right-[6vw] bottom-[7vh] grid grid-cols-3 gap-[1.8vw]">
        <div className="border-t-2 border-primary pt-[1.5vh] flex flex-col">
          <div className="flex items-baseline gap-[0.8vw] mb-[1.2vh]">
            <span className="font-display font-bold text-[1vw] text-accent tabular-nums">A</span>
            <h3 className="font-display font-bold text-[1.5vw] text-primary uppercase tracking-[0.1em]">Pre-sales</h3>
          </div>
          <div className="space-y-[1.1vh]">
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">1. Capture</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Web form, inbound email, or manual entry creates a Lead with source, owner, and timestamp.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">2. Triage</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Round-robin assignment to a sales owner. AI flags hot leads from message content.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">3. Qualify</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Owner logs calls, notes, and meetings. Every touch becomes an Activity on the Lead.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">4. Convert</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">One-click: Lead becomes Account + Contact + Opportunity. Lead archived, history preserved.</p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-accent pt-[1.5vh] flex flex-col">
          <div className="flex items-baseline gap-[0.8vw] mb-[1.2vh]">
            <span className="font-display font-bold text-[1vw] text-accent tabular-nums">B</span>
            <h3 className="font-display font-bold text-[1.5vw] text-primary uppercase tracking-[0.1em]">Active deal</h3>
          </div>
          <div className="space-y-[1.1vh]">
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">5. Discovery</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Stage advances through Qualified, Needs Analysis, Proposal. Forecast value (GBP) updates.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">6. Quote</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Line items added with qty, unit price, discount. Subtotal, VAT, total auto-calculated. Version 1 saved as Draft.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">7. Approve</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Routed by tier (deal size, discount). Approver notified in-app + email. Decision + comment logged.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">8. Send</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">PDF rendered, tracked email sent via SMTP. 1&times;1 pixel records opens with timestamp + IP.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">9. Negotiate &amp; accept</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Replies thread back via IMAP. New versions saved. On accept, Quote status &rarr; Accepted.</p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-primary pt-[1.5vh] flex flex-col">
          <div className="flex items-baseline gap-[0.8vw] mb-[1.2vh]">
            <span className="font-display font-bold text-[1vw] text-accent tabular-nums">C</span>
            <h3 className="font-display font-bold text-[1.5vw] text-primary uppercase tracking-[0.1em]">Fulfilment</h3>
          </div>
          <div className="space-y-[1.1vh]">
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">10. Order created</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Auto-generated from accepted Quote. Line items, totals, customer inherited. Status &rarr; Pending.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">11. Confirm &amp; fulfil</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Owner confirms; status flows Confirmed &rarr; In Fulfilment &rarr; Delivered. Tasks created per line.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">12. Invoice</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Generated on dispatch. Sent via tracked email. Status &rarr; Invoiced; due date tracked.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">13. Payment</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Recorded against the Order in GBP. Status &rarr; Paid. Opportunity &rarr; Closed Won, value attributed.</p>
            </div>
            <div>
              <div className="font-body font-semibold text-[1.1vw] text-primary">14. Retain</div>
              <p className="font-body text-[0.95vw] leading-snug text-text/80">Full timeline kept on Account: emails, calls, quotes, approvals, orders. Powers renewal &amp; cross-sell.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[3vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
