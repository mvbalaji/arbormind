export default function Architecture() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <span className="font-body text-[1.1vw] uppercase tracking-[0.3em] text-accent font-semibold">08 / Architecture</span>
        <span className="font-display font-bold text-[1.3vw] text-primary tabular-nums">08 / 12</span>
      </div>

      <div className="absolute left-[6vw] top-[14vh] right-[6vw]">
        <div className="h-[0.25vh] w-[4vw] bg-accent mb-[2.5vh]" />
        <h2 className="font-display font-bold text-[5vw] leading-[1] tracking-tight text-primary">System architecture</h2>
      </div>

      <div className="absolute left-[6vw] top-[40vh] right-[6vw] grid grid-cols-12 gap-[2.5vw] items-start">
        <div className="col-span-5">
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">01</span>
            <p className="font-body text-[1.4vw] leading-snug text-text"><span className="font-semibold text-primary">Monorepo</span> &mdash; pnpm workspaces with isolated artifacts per surface.</p>
          </div>
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">02</span>
            <p className="font-body text-[1.4vw] leading-snug text-text"><span className="font-semibold text-primary">Frontend</span> &mdash; React, Vite, Tailwind, Wouter routing.</p>
          </div>
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">03</span>
            <p className="font-body text-[1.4vw] leading-snug text-text"><span className="font-semibold text-primary">API</span> &mdash; Express + TypeScript, sessions on connect-pg-simple.</p>
          </div>
          <div className="flex items-start gap-[1vw] mb-[1.6vh]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">04</span>
            <p className="font-body text-[1.4vw] leading-snug text-text"><span className="font-semibold text-primary">Database</span> &mdash; PostgreSQL via Drizzle ORM, fully typed schema.</p>
          </div>
          <div className="flex items-start gap-[1vw]">
            <span className="font-display font-bold text-[1.1vw] text-accent tabular-nums mt-[0.4vh]">05</span>
            <p className="font-body text-[1.4vw] leading-snug text-text"><span className="font-semibold text-primary">Email</span> &mdash; nodemailer for SMTP, imapflow for inbound polling.</p>
          </div>
        </div>

        <div className="col-span-7">
          <svg viewBox="0 0 700 380" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="30" width="160" height="80" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="120" y="62" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Browser</text>
            <text x="120" y="86" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">React + Vite</text>

            <line x1="200" y1="70" x2="270" y2="70" stroke="#1B3B2F" strokeWidth="2" />
            <polygon points="270,65 280,70 270,75" fill="#1B3B2F" />
            <text x="235" y="60" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">HTTPS</text>

            <rect x="280" y="30" width="180" height="80" fill="#1B3B2F" stroke="#1B3B2F" strokeWidth="2" />
            <text x="370" y="62" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#F4F1EC">Express API</text>
            <text x="370" y="86" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#F4F1EC" opacity="0.75">TypeScript + sessions</text>

            <line x1="460" y1="70" x2="530" y2="70" stroke="#1B3B2F" strokeWidth="2" />
            <polygon points="530,65 540,70 530,75" fill="#1B3B2F" />
            <text x="495" y="60" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fill="#6B6157">SQL</text>

            <rect x="540" y="30" width="130" height="80" fill="#ECE7DF" stroke="#1B3B2F" strokeWidth="2" />
            <text x="605" y="62" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="18" fill="#1B3B2F">Postgres</text>
            <text x="605" y="86" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#6B6157">Drizzle ORM</text>

            <line x1="320" y1="110" x2="320" y2="200" stroke="#C97B3E" strokeWidth="2" strokeDasharray="6 4" />
            <polygon points="315,200 320,210 325,200" fill="#C97B3E" />
            <rect x="220" y="210" width="200" height="60" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="320" y="238" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="16" fill="#1B3B2F">SMTP send</text>
            <text x="320" y="258" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">nodemailer + tracking pixel</text>

            <line x1="420" y1="110" x2="420" y2="290" stroke="#C97B3E" strokeWidth="2" strokeDasharray="6 4" />
            <polygon points="415,290 420,300 425,290" fill="#C97B3E" />
            <rect x="320" y="300" width="200" height="60" fill="#ECE7DF" stroke="#C97B3E" strokeWidth="2" />
            <text x="420" y="328" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="16" fill="#1B3B2F">IMAP poller</text>
            <text x="420" y="348" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#6B6157">imapflow, default 15 min</text>
          </svg>
        </div>
      </div>

      <div className="absolute bottom-[3.5vh] left-[6vw] right-[6vw] flex items-center justify-between border-t border-line pt-[1.5vh]">
        <span className="font-body text-[1vw] uppercase tracking-[0.25em] text-muted">ArborMind / CRM Overview</span>
        <span className="font-body text-[1vw] text-muted">arbormind.in</span>
      </div>
    </div>
  );
}
