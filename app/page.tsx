import Link from "next/link";
import { PageShell, PhotoBlock } from "./components";
import HeroSlider from "./HeroSlider";

const spaces = [
  ["01", "POOL & WATER", "탁 트인 풍경 속에서 즐기는 물과 휴식", "/images/facility-wide.webp"],
  ["02", "TENT", "하루의 속도를 낮추는 프라이빗한 자리", "/images/tent-walkway.webp"],
  ["03", "BBQ & GRILL", "함께 차리고 나누는 자연 속의 식사", "/images/pool-tents.webp"],
  ["04", "CAFE", "머무는 시간 사이에 만나는 여유", "/images/cafe-building.webp"],
  ["05", "PARTY & RENTAL", "모임과 촬영을 위한 특별한 공간", "/images/main-building.webp"],
];

export default function Home() {
  return <PageShell><main>
    <section className="home-hero">
      <HeroSlider />
      <div className="hero-copy"><p className="eyebrow">NATURE · REST · EXPERIENCE</p><h1>자연 속에서<br />다시 만나는 하루</h1><p>수영, 바비큐, 카페와 휴식이 하나의 흐름으로 이어지는 자연 속 복합 공간입니다.</p><div className="actions"><Link href="/space" className="button light">공간 둘러보기</Link><Link href="/reservation" className="button text light-text">예약 안내 <span>→</span></Link></div></div>
    </section>

    <section className="intro split"><p className="eyebrow">WELCOME TO RE:LIM</p><div><h2>머무는 시간 자체가<br />하나의 일정이 되는 곳</h2><p>복잡한 일상에서 잠시 벗어나 가볍게 쉬고, 즐기고, 다시 돌아갈 수 있도록 리림의 하루를 구성했습니다.</p><Link href="/about" className="line-link">브랜드 이야기 보기 <span>↗</span></Link></div></section>

    <section className="space-preview"><div className="section-head"><div><p className="eyebrow">OUR SPACE</p><h2>리림에서 보내는 하루</h2></div><Link href="/space" className="line-link">전체 공간 보기 <span>↗</span></Link></div><div className="space-grid">{spaces.map(([n, name, desc, src]) => <Link href="/space" className="space-card" key={name}><PhotoBlock label={`${name} 공간`} src={src} portrait={name === "CAFE" || name === "PARTY & RENTAL"} /><div><small>{n}</small><h3>{name}</h3><p>{desc}</p><span className="card-arrow">↗</span></div></Link>)}</div></section>

    <section className="time-banner"><p className="eyebrow">OPERATING HOURS</p><div><span>오전 타임</span><strong>09:00 — 14:00</strong></div><div><span>오후 타임</span><strong>16:00 — 21:00</strong></div><Link href="/guide" className="button light">이용 안내 확인</Link></section>

    <section className="visit split"><p className="eyebrow">VISIT RE:LIM</p><div><h2>오늘의 속도를 내려놓고<br />리림에서 쉬어가세요.</h2><div className="actions"><Link href="/reservation" className="button primary">예약 안내</Link><Link href="/location" className="button text">오시는 길 <span>→</span></Link></div></div></section>
  </main></PageShell>;
}
