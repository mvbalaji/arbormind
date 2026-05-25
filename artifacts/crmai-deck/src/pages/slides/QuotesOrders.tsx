export default function QuotesOrders() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">04 / Commerce</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">04 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">Quotes &amp; orders</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-2 gap-[3vw]">
        <div>
          <div className="flex items-baseline gap-[1vw] mb-[2vh]">
            <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">01</span>
            <h3 className="font-display font-bold text-[2.4vw] text-primary leading-tight">Quote</h3>
          </div>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.4vh]">Line items with product, quantity, unit price, and discount &mdash; subtotal, VAT, and total auto-calculated in GBP.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.4vh]">Version history per revision: every send and amendment captured.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.4vh]">PDF generated and sent via tracked email, with open and accept events recorded.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85">
            States: <span className="font-semibold text-primary">Draft</span> &middot; <span className="font-semibold text-primary">In Review</span> &middot; <span className="font-semibold text-accent">Approved</span> &middot; <span className="font-semibold text-primary">Sent</span> &middot; <span className="font-semibold text-primary">Accepted / Rejected / Expired</span>.
          </p>
        </div>

        <div>
          <div className="flex items-baseline gap-[1vw] mb-[2vh]">
            <span className="font-display font-bold text-[1.3vw] text-accent tabular-nums">02</span>
            <h3 className="font-display font-bold text-[2.4vw] text-primary leading-tight">Order</h3>
          </div>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.4vh]">Created automatically when a quote is accepted &mdash; line items, totals, and customer carried over.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.4vh]">Linked to its source quote, opportunity, and account for full traceability.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85 mb-[1.4vh]">Fulfilment tracked on the order record; invoice generated on dispatch.</p>
          <p className="font-body text-[1.5vw] leading-snug text-text/85">
            States: <span className="font-semibold text-primary">Pending</span> &middot; <span className="font-semibold text-primary">Confirmed</span> &middot; <span className="font-semibold text-primary">In Fulfilment</span> &middot; <span className="font-semibold text-primary">Delivered</span> &middot; <span className="font-semibold text-accent">Invoiced</span> &middot; <span className="font-semibold text-accent">Paid</span>.
          </p>
        </div>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
