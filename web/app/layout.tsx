import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantora — Cold-Calling AI Voice Agent",
  description:
    "Vantora live demo: talk to the AI cold-call agent, place outbound calls, and review recordings + transcripts.",
  applicationName: "Vantora",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b100e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <header className="site-header">
            <Link href="/" className="brand">
              Van<span>tora</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/#demo" className="nav-btn primary">
                Demo
              </Link>
              <Link href="/#talk" className="nav-btn">
                Call Agent
              </Link>
              <Link href="/calls" className="nav-btn">
                Call History
              </Link>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            Vantora · Likva9 assessment · Recordings + transcripts per call · Recruiters: use Call Agent
          </footer>
        </div>
      </body>
    </html>
  );
}
