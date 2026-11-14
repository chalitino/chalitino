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
  // Dierenstrook: alle dieren als gelijke blokken, volgorde uit het merkhandboek
  strip: ["#E0452C", "#F0B43A", "#D9824A", "#B5A58A", "#C4956A", "#A8A060", "#9DB88A", "#E8955A", "#A67C6D", "#C98BB0", "#D4B483", "#8FBCE6", "#8FA67A"],
};

/** Dierkleuren uit het BRUUN merkhandboek (05 · Kleur). Tekst en logo op een dierkleur zijn altijd bruun. */
export const ANIMAL_COLORS: Record<string, string> = {
  Rund: "#E0452C", Kip: "#F0B43A", Kalkoen: "#D9824A", Eend: "#B5A58A", Lam: "#C4956A", Geit: "#A8A060", Hert: "#9DB88A", Zwijn: "#E8955A", Paard: "#A67C6D", Konijn: "#C98BB0", Kameel: "#D4B483", Vis: "#8FBCE6", Supplementen: "#8FA67A",
};
export const animalColor = (a: string | null | undefined) => (a && ANIMAL_COLORS[a]) || "#D4B483";

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
