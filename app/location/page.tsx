import { PageHero, PageShell, PhotoBlock } from "../components";

const mapUrl = "https://map.naver.com/p/entry/place/30821021?lng=127.3131001&lat=37.1184942&placePath=%2Fhome&entry=plt&searchType=place";

export default function Location() {
  return <PageShell><main>
    <PageHero eyebrow="LOCATION" title="리림으로 오시는 길" desc="경기도 용인의 자연과 가까워지는 길 끝에서 리림을 만나보세요. 출발 전 네이버 지도에서 위치와 이동 경로를 확인해 주세요." />
    <section className="location-photo"><PhotoBlock label="리림 진입 동선과 텐트 전경" src="/images/tent-walkway.webp" /></section>
    <a className="map-box" href={mapUrl} target="_blank" rel="noreferrer" aria-label="네이버 지도에서 리림 위치 열기"><div><span>NAVER MAP</span><strong>RE:LIM · YONGIN</strong><small>지도를 열어 길찾기 ↗</small></div></a>
    <section className="location-info"><div><small>ADDRESS</small><h2>경기도 용인시 처인구 원삼면</h2><p>보개원삼로1372번길 41</p></div><a className="button primary" href={mapUrl} target="_blank" rel="noreferrer">네이버 지도 열기</a></section>
    <section className="notice"><p className="eyebrow">ARRIVAL &amp; PARKING</p><div><h2>도착 및 주차 안내</h2><p>현장에 도착하면 안내된 주차 구역에 차량을 세운 뒤 예약자명으로 체크인해 주세요. 짐을 내리거나 공간으로 이동할 때에는 현장 동선과 안전 안내를 따라주시기 바랍니다.</p><p>현장 주차가 가능하며, 주말과 성수기에는 주변 도로와 주차장이 혼잡할 수 있습니다. 예약 시간보다 여유 있게 출발해 주세요.</p><p className="muted">길찾기 또는 진입 경로 문의는 고객센터 <a href="tel:010-5794-8823">010-5794-8823</a>으로 연락해 주세요.</p></div></section>
  </main></PageShell>;
}
