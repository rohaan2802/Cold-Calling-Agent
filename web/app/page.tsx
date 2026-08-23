import CallHistory from "@/components/CallHistory";
import OutboundDialer from "@/components/OutboundDialer";
import TalkToAgent from "@/components/TalkToAgent";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="hero" id="demo">
        <p className="eyebrow">Cold-calling AI · Live demo</p>
        <p className="hero-brand">Vantora</p>
        <h1>Alex — outbound voice agent that handles objections like a closer</h1>
        <p className="lede">
          Natural conversations, real outbound calls, and a full call log with playable recordings.
          Recruiters: tap <strong>Call Agent</strong> and talk in the browser — no phone credits needed.
        </p>
        <div className="hero-actions">
          <a href="#talk" className="action-btn primary">
            Call Agent
          </a>
          <Link href="/calls" className="action-btn">
            Call History
          </Link>
          <a href="#outbound" className="action-btn">
            Outbound Dialer
          </a>
        </div>
      </section>

      <div className="grid-2">
        <div id="talk">
          <TalkToAgent />
        </div>
        <div id="outbound">
          <OutboundDialer />
        </div>
      </div>

      <CallHistory />
    </main>
  );
}
