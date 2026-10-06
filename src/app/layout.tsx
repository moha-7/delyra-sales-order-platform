import type { Metadata } from "next";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "Delyra | Sales & Order Lifecycle Platform",
  description: "Delyra is a sales and order lifecycle platform for pipeline, pricing, approvals, deposits, order handover, and reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
