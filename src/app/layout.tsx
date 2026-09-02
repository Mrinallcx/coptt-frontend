import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DisclaimerGate } from "@/components/disclaimer-gate";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toto Finance — The Global Infrastructure for Tokenized Commodities",
  description:
    "Building digital infrastructure for tokenized commodities — asset-backed ownership, instant settlement, compliant global trade (metals, energy, real-world assets)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // AuthProvider hydrates from localStorage on mount — it's a client
  // component but safe to render in this server component's tree because
  // Next.js handles the boundary. Toaster is the sonner sink for toast()
  // calls anywhere in the tree.
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <DisclaimerGate />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
