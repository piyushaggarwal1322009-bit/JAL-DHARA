"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Moon, Sun, Waves, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Workspace" },
  { href: "/map", label: "Field map" },
  { href: "/network", label: "Water network" },
  { href: "/parampara", label: "Parampara" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("jalsaarthi-theme");
    const nextDark = stored === "dark";
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    window.localStorage.setItem("jalsaarthi-theme", nextDark ? "dark" : "light");
  }

  return (
    <header className={scrolled ? "site-nav-shell is-scrolled" : "site-nav-shell"}>
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Waves size={19} strokeWidth={2.1} /></span>
          <span>JalSaarthi <strong>X</strong></span>
        </Link>
        <div className={`nav-links ${open ? "is-open" : ""}`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className={mounted && path === link.href ? "nav-link active" : "nav-link"}
              aria-current={mounted && path === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} theme`} title={`Switch to ${dark ? "light" : "dark"} theme`}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/#workspace" className="nav-cta" onClick={() => setOpen(false)}>
            Open demo <ArrowUpRight size={16} />
          </Link>
        </div>
        <button className="nav-toggle" aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
    </header>
  );
}
