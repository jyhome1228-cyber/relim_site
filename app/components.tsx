import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["ABOUT", "/about"],
  ["SPACE", "/space"],
  ["GUIDE", "/guide"],
  ["RESERVATION", "/reservation"],
  ["LOCATION", "/location"],
  ["FAQ", "/faq"],
] as const;

export function Header() {
  return <header className="site-header">
    <Link href="/" className="logo" aria-label="RE:LIM 홈"><strong>RE:LIM</strong><span>NATURE &amp; REST</span></Link>
    <input id="menu" className="menu-toggle" type="checkbox" aria-label="메뉴 열기" />
    <label htmlFor="menu" className="menu-button"><span /><span /></label>
    <nav>{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <a className="header-cta" href="tel:01057948823">RESERVATION</a>
  </header>;
}

export function Footer() {
  return <footer>
    <div><div className="logo footer-logo"><strong>RE:LIM</strong><span>NATURE &amp; REST</span></div><p>자연 속에서 다시 만나는 온전한 하루</p></div>
    <div className="footer-info"><p>대표 010-3043-8822 · 고객센터 010-5794-8823</p><p>사업자등록번호 220-86-50466</p><p>© 2026 RE:LIM. ALL RIGHTS RESERVED.</p></div>
  </footer>;
}

export function PageShell({ children }: { children: ReactNode }) { return <><Header />{children}<Footer /></>; }

export function PageHero({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return <section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="hero-desc">{desc}</p></section>;
}

export function PhotoBlock({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`photo-block ${className}`} role="img" aria-label={`${label} 사진 교체 영역`}><span>{label}</span><small>IMAGE AREA</small></div>;
}
