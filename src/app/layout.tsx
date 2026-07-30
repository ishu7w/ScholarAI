import type { Metadata } from "next";
import { Familjen_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const familjenGrotesk = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Alias: legacy headings reference --font-space-grotesk — point it at
// the Editions display face so every heading converts without edits.
const displayAlias = Familjen_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
