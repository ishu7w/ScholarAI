import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const familjenGrotesk = localFont({
  src: "./fonts/familjen-grotesk-latin.woff2",
  variable: "--font-familjen",
  weight: "500 700",
});

// Alias: legacy headings reference --font-space-grotesk — point it at
// the Editions display face so every heading converts without edits.
const displayAlias = localFont({
  src: "./fonts/familjen-grotesk-latin.woff2",
  variable: "--font-space-grotesk",
  weight: "500 700",
});

const splineSansMono = localFont({
  src: "./fonts/spline-sans-mono-latin.woff2",
  variable: "--font-spline-mono",
  weight: "400 600",
});

export const metadata: Metadata = {
  title: "ScholarAI — AI-Powered Scholarship Intelligence",
  description:
    "ScholarAI matches deserving students with the right scholarships using explainable AI — eligibility prediction, document verification, and fair candidate ranking for institutions.",
  keywords: [
    "scholarship",
    "AI recommendation",
    "explainable AI",
    "student funding",
    "education",
  ],
  openGraph: {
    title: "ScholarAI — AI-Powered Scholarship Intelligence",
    description:
      "Fair, explainable, AI-driven scholarship matching for students and institutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${familjenGrotesk.variable} ${displayAlias.variable} ${splineSansMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
