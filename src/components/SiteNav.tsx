"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Waves, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Workspace" },
  { href: "/parampara", label: "Parampara" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-nav-shell">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Waves size={19} strokeWidth={2.1} /></span>
          <span>JalSaarthi <strong>X</strong></span>
        </Link>
        <div className={`nav-links ${open ? "is-open" : ""}`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className={path === link.href ? "nav-link active" : "nav-link"}
              aria-current={path === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <Link href="/#workspace" className="nav-cta" onClick={() => setOpen(false)}>
          Open demo <ArrowUpRight size={16} />
        </Link>
        <button className="nav-toggle" aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
    </header>
  );
}
