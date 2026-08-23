import CallHistory from "@/components/CallHistory";
import Link from "next/link";

export default function CallsPage() {
  return (
    <main>
      <Link href="/" className="back-link page-back">
        <span className="back-arrow" aria-hidden="true">
          ←
        </span>
        Home
      </Link>
      <CallHistory />
    </main>
  );
}
