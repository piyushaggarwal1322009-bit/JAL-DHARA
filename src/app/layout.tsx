import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "JalSaarthi X — Water networks, understood",
  description: "An illustrative, Eri-inspired water network workspace for simulating broken channels and comparing repair strategies.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteNav />{children}<footer className="site-footer"><span>JalSaarthi X</span><span>PARAMPARA TO PROTOTYPE · Illustrative engineering model</span></footer></body></html>;
}
