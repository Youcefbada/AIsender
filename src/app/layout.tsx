import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIToolSender — AI lead discovery & personalized outreach",
  description:
    "Find the highest-quality prospects for your product and send genuinely personalized outreach. Quality over quantity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
