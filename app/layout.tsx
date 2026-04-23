import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "@/app/globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://postgres-query-explainer.app"),
  title: "Postgres Query Explainer | Visual PostgreSQL query execution plans",
  description:
    "Visualize PostgreSQL execution plans, inspect node-level costs, and optimize slow SQL faster with an interactive plan graph.",
  keywords: [
    "postgres explain",
    "postgres execution plan",
    "sql performance tuning",
    "database optimization",
    "query planner visualizer"
  ],
  openGraph: {
    title: "Postgres Query Explainer",
    description:
      "Interactive PostgreSQL plan visualizer for backend engineers and DBAs who need faster performance diagnosis.",
    type: "website",
    url: "https://postgres-query-explainer.app",
    siteName: "Postgres Query Explainer"
  },
  twitter: {
    card: "summary_large_image",
    title: "Postgres Query Explainer",
    description:
      "Understand and optimize PostgreSQL plans with an interactive execution graph and node-specific recommendations."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${headingFont.variable} ${monoFont.variable} bg-[#0d1117] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
