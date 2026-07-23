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

const mapUrl = "https://map.naver.com/p/entry/place/30821021?lng=127.3131001&lat=37.1184942&placePath=%2Fhome&entry=plt&searchType=place";

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
    <div className="footer-brand">
      <div className="logo footer-logo"><strong>RE:LIM</strong><span>NATURE &amp; REST</span></div>
      <p>수영과 바비큐, 카페와 쉼이<br />자연 속에서 하나로 이어지는 하루.</p>
      <a className="footer-instagram" href="https://www.instagram.com/relimofficial/" target="_blank" rel="noreferrer" aria-label="리림 공식 인스타그램 새 창에서 열기">INSTAGRAM <span>@RELIMOFFICIAL ↗</span></a>
    </div>
    <div className="footer-column">
      <strong>EXPLORE</strong>
      <div className="footer-nav"><Link href="/about">ABOUT</Link><Link href="/space">SPACE</Link><Link href="/guide">GUIDE</Link><Link href="/reservation">RESERVATION</Link><Link href="/location">LOCATION</Link><Link href="/faq">FAQ</Link></div>
    </div>
    <div className="footer-info">
      <strong>CONTACT</strong>
      <p><span>대표 문의</span><a href="tel:010-3043-8822">010-3043-8822</a></p>
      <p><span>고객센터</span><a href="tel:010-5794-8823">010-5794-8823</a></p>
      <p className="footer-note">예약 및 공간 이용은 사전 문의 후 방문해 주세요.</p>
    </div>
    <div className="footer-info">
      <strong>LOCATION</strong>
      <a className="footer-address" href={mapUrl} target="_blank" rel="noreferrer">경기도 용인시 처인구 원삼면<br />보개원삼로1372번길 41 ↗</a>
      <p className="footer-note">현장 주차 가능 · 방문 전 예약 확인</p>
    </div>
    <div className="footer-bottom">
      <p>RE:LIM · NATURE &amp; REST</p>
      <p>© 2026 RE:LIM. ALL RIGHTS RESERVED.</p>
    </div>
  </footer>;
}

export function PageShell({ children }: { children: ReactNode }) { return <><Header />{children}<Footer /></>; }

export function PageHero({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return <section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="hero-desc">{desc}</p></section>;
}

export function PhotoBlock({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`photo-block ${className}`} aria-label={`${label} 이미지 삽입 예정 영역`}><span>{label}</span><small>PHOTO TO BE ADDED</small></div>;
}
