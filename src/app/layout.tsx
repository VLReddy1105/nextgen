import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GenZnect | People, Opportunities and Ideas in One Place",
    template: "%s | GenZnect",
  },
  description:
    "GenZnect connects students, founders, companies, universities, mentors, and communities through opportunities, collaboration, events, and meaningful professional connections.",
  openGraph: {
    title: "GenZnect | People, Opportunities and Ideas in One Place",
    description:
      "People, opportunities, communities, and ideas in one connected professional space.",
    type: "website",
    siteName: "GenZnect",
  },
  twitter: {
    card: "summary_large_image",
    title: "GenZnect",
    description:
      "A professional community for people and organizations building meaningful progress together.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
