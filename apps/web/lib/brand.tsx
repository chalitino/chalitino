// Huisstijl-onderdelen uit het WicoTreats-thema: logo, zegel, dierkleuren, kleurstrook, teksten.
import logo from "./logo-paths.json";

export const LOGO_COLORS = logo.colors as { bruun: string; creme: string; kip: string };

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

/** Liggend logo "wico treats" (officiële letterpaden), kleur via currentColor. */
export function Wordmark({ className = "", height = 30 }: { className?: string; height?: number }) {
  return (
    <svg className={className} role="img" aria-label="WicoTreats" width={Math.round(height * 12500 / 1480)} height={height} viewBox="0 -1300 12500 1480" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d={logo.wico} />
      <path fill="currentColor" transform="translate(5420 -60)" d={logo.treats} />
    </svg>
  );
}

/** Gestapeld logo "wico / treats". */
export function LogoStacked({ className = "", height = 80 }: { className?: string; height?: number }) {
  return (
    <svg className={className} role="img" aria-label="WicoTreats" width={Math.round(height * 5140 / 2413)} height={height} viewBox="21 -1278 5140 2413.2" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d={logo.wico} />
      <path fill="currentColor" transform="translate(-1 1035.7) scale(0.7321)" d={logo.treats} />
    </svg>
  );
}

/** Monogram (de W), optioneel op een gekleurde cirkel. */
export function Monogram({ size = 40, bg, fg = "currentColor" }: { size?: number; bg?: string; fg?: string }) {
  return bg ? (
    <svg width={size} height={size} viewBox="-748.9 -2162.4 3372.7 3372.7" aria-hidden="true"><circle cx="937.5" cy="-476" r="1686.4" fill={bg} /><path fill={fg} d={logo.monogram} /></svg>
  ) : (
    <svg width={size} height={Math.round(size * 1020 / 1875)} viewBox="0 -985 1875 1020" aria-hidden="true"><path fill={fg} d={logo.monogram} /></svg>
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
