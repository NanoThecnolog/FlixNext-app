const aliases: Record<string, string> = {
  PT: "Português",
  POR: "Português",
  POB: "Português",
  PORTUGUES: "Português",
  PORTUGUESE: "Português",
  "BRAZILIAN PORTUGUESE": "Português",
  "PORTUGUES BRASIL": "Português",
  EN: "Inglês",
  ENG: "Inglês",
  ENGLISH: "Inglês",
  INGLES: "Inglês",
  ES: "Espanhol",
  SPA: "Espanhol",
  ESP: "Espanhol",
  SPANISH: "Espanhol",
  ESPANOL: "Espanhol",
  JA: "Japonês",
  JPN: "Japonês",
  JAPANESE: "Japonês",
  FR: "Francês",
  FRE: "Francês",
  FRA: "Francês",
  FRENCH: "Francês",
  DE: "Alemão",
  GER: "Alemão",
  DEU: "Alemão",
  GERMAN: "Alemão",
  IT: "Italiano",
  ITA: "Italiano",
  RU: "Russo",
  RUS: "Russo",
  KO: "Coreano",
  KOR: "Coreano",
  ZH: "Chinês",
  CHI: "Chinês",
  ZHO: "Chinês",
  AR: "Árabe",
  ARA: "Árabe",
  CS: "Tcheco",
  CZE: "Tcheco",
  DA: "Dinamarquês",
  DAN: "Dinamarquês",
  EL: "Grego",
  GRE: "Grego",
  FI: "Finlandês",
  FIN: "Finlandês",
  HE: "Hebraico",
  HEB: "Hebraico",
  HU: "Húngaro",
  HUN: "Húngaro",
  ID: "Indonésio",
  IND: "Indonésio",
  NL: "Holandês",
  NLD: "Holandês",
  PL: "Polonês",
  POL: "Polonês",
  RO: "Romeno",
  RON: "Romeno",
  SV: "Sueco",
  SWE: "Sueco",
  TH: "Tailandês",
  THA: "Tailandês",
  TR: "Turco",
  TUR: "Turco",
  VI: "Vietnamita",
  VIE: "Vietnamita",
  UK: "Ucraniano",
  UKR: "Ucraniano",
  HI: "Hindi",
  HIN: "Hindi",
  UND: "Outro",
  UNK: "Outro",
  UNKNOWN: "Outro",
};

export const languageKey = (value?: string | null) =>
  value
    ?.trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .toUpperCase() ?? "";

export const normalizeLanguage = (value?: string | null) => {
  const normalized = languageKey(value);
  if (!normalized) return "Outro";
  return (
    aliases[normalized] ??
    aliases[normalized.replace(/\s*\([^)]*\)\s*$/, "")] ??
    aliases[normalized.split("-")[0]] ??
    value?.trim() ??
    "Outro"
  );
};
