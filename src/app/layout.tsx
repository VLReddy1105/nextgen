import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NextGen Community | People, Opportunities and Ideas in One Place",
    template: "%s | NextGen Community",
  },
  description:
    "NextGen Community connects students, founders, companies, universities, mentors, and communities through opportunities, collaboration, events, and meaningful professional connections.",
  openGraph: {
    title: "NextGen Community | People, Opportunities and Ideas in One Place",
    description:
      "People, opportunities, communities, and ideas in one connected professional space.",
    type: "website",
    siteName: "NextGen Community",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextGen Community",
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
