// Huisstijl-onderdelen uit het WicoTreats-thema: woordmerk, zegel, dierkleuren, kleurstrook, teksten.
export const brand = {
  name: "WicoTreats",
  legalName: "Wico Diervoeding V.O.F.",
  tagline: ["Groothandel in natuurlijke hondensnacks", "Verpakt in Limburg", "Sinds 1993"],
  slogan: "We have nothing to hide.",
  sloganPack: "Met de hand ingepakt in Swalmen.",
  address: ["Maalbroekweg 1B", "6071 NS Swalmen (NL)"],
  email: "info@wicotreats.com",
  phone: "06 13148616",
  registrations: "KvK 13033716 · NVWA 7346",
  payments: ["iDEAL", "Bancontact", "Overboeking", "Op rekening"],
  consumerSite: "https://bruunpets.com",
  strip: ["#8b3a2a", "#4a3933", "#7a6a3e", "#b86f4a", "#c9a24a", "#3e6a8a", "#9a8a7a", "#5a4a3a", "#b08a5a", "#6a7a5a"],
};

/** Kleur per diersoort (zoals de diersoort-metaobjecten in het thema). Pas aan naar wens. */
export const ANIMAL_COLORS: Record<string, string> = {
  Rund: "#8b3a2a", Kip: "#c9a24a", Lam: "#7a6a3e", Eend: "#3e6a8a", Hert: "#5a4a3a", Varken: "#b86f4a", Vis: "#6a7a5a", Kalkoen: "#b08a5a", Konijn: "#9a8a7a", Paard: "#4a3933", Geit: "#b8a07a", Kangoeroe: "#a8623a", Struisvogel: "#6e5a4e",
};
export const animalColor = (a: string | null | undefined) => (a && ANIMAL_COLORS[a]) || "#cbb89a";

/** Woordmerk als tekst-SVG in Gluten, kleur via currentColor (zelfde als snippets/logo-woordmerk.liquid). */
export function Wordmark({ className = "", height = 30 }: { className?: string; height?: number }) {
  return (
    <svg className={className} role="img" aria-label="WicoTreats" width={Math.round(height * 1000 / 230)} height={height} viewBox="0 0 1000 230" xmlns="http://www.w3.org/2000/svg">
      <text x="2" y="178" fill="currentColor" fontFamily="Gluten, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif" fontWeight="800" fontSize="200" textLength="994" lengthAdjust="spacingAndGlyphs">WicoTreats</text>
    </svg>
  );
}

/** Rond merkzegel (snippets/seal.liquid). */
export function Seal({ size = 72, id = "a" }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id={`seal-c-${id}`} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" /></defs>
      <circle cx="60" cy="60" r="58.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="1" />
      <text fontFamily="Rethink Sans, system-ui, sans-serif" fontWeight="700" fontSize="8.4" letterSpacing="1.9" fill="currentColor"><textPath href={`#seal-c-${id}`}>WICO TREATS · SWALMEN NL · ESTD 1993 ·</textPath></text>
      <text x="60" y="60" textAnchor="middle" fontFamily="Gluten, Arial Rounded MT Bold, sans-serif" fontWeight="800" fontSize="30" fill="currentColor">W</text>
      <text x="60" y="72" textAnchor="middle" fontFamily="Rethink Sans, system-ui, sans-serif" fontWeight="700" fontSize="6.2" letterSpacing="1.4" fill="currentColor">NVWA 7346</text>
    </svg>
  );
}

export function Strook({ className = "" }: { className?: string }) {
  return <div className={`strook ${className}`} aria-hidden="true">{brand.strip.map((c) => <span key={c} style={{ background: c }} />)}</div>;
}
