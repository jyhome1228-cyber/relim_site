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
    <Link className="header-cta" href="/reservation">RESERVATION</Link>
  </header>;
}

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-brand"><div className="logo footer-logo"><strong>RE:LIM</strong><span>NATURE &amp; REST</span></div><p>자연 속에서 다시 만나는 온전한 하루</p></div>
    <div className="footer-nav"><Link href="/about">ABOUT</Link><Link href="/space">SPACE</Link><Link href="/guide">GUIDE</Link><Link href="/reservation">RESERVATION</Link><Link href="/location">LOCATION</Link><Link href="/faq">FAQ</Link></div>
    <div className="footer-info"><strong>VISIT RE:LIM</strong><p>예약 및 공간 이용은 사전 문의 후 방문해 주세요.</p><p>Yongin, Gyeonggi-do</p><p className="copyright">© 2026 RE:LIM. ALL RIGHTS RESERVED.</p></div>
  </footer>;
}

export function PageShell({ children }: { children: ReactNode }) { return <><Header />{children}<Footer /></>; }

export function PageHero({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return <section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="hero-desc">{desc}</p></section>;
}

export function PhotoBlock({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`photo-block ${className}`} aria-label={`${label} 이미지 삽입 예정 영역`}><span>{label}</span><small>PHOTO TO BE ADDED</small></div>;
}
