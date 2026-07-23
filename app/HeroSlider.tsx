"use client";

import { useEffect, useState } from "react";

const slides = [
  { src: "/images/hero-panorama.webp", alt: "산과 수로, 흰색 아치형 텐트가 펼쳐진 리림 전경" },
  { src: "/images/hero-pool.webp", alt: "리림의 수영장과 텐트를 위에서 바라본 전경" },
  { src: "/images/hero-night.webp", alt: "수영장 조명과 텐트의 불빛이 어우러진 리림의 밤" },
  { src: "/images/hero-waterway.webp", alt: "리림의 넓은 잔디와 수로, 메인동 전경" },
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-slider" aria-roledescription="carousel" aria-label="리림 주요 전경">
      {slides.map((slide, index) => (
        <img
          key={slide.src}
          className={index === active ? "active" : ""}
          src={slide.src}
          alt={slide.alt}
          loading={index === 0 ? "eager" : "lazy"}
        />
      ))}
      <div className="hero-shade" />
      <div className="hero-indicator" aria-label={`${active + 1}번째 이미지`}>
        <span>{String(active + 1).padStart(2, "0")}</span>
        <div>{slides.map((slide, index) => <button key={slide.src} onClick={() => setActive(index)} className={index === active ? "active" : ""} aria-label={`${index + 1}번째 이미지 보기`} />)}</div>
        <span>{String(slides.length).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
