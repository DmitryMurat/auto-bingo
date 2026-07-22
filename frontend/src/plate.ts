const PLATE_LETTERS = "ABEKMHOPCTYX";

// ML Kit's Latin-script recognizer reads Russian plate letters (which are
// Cyrillic glyphs that double as Latin lookalikes) as Latin characters, but
// just in case it returns the actual Cyrillic codepoints, normalize them too.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
};

const PLATE_RE = new RegExp(`[${PLATE_LETTERS}]\\s*\\d{3}\\s*[${PLATE_LETTERS}]{2}\\s*(\\d{2,3})\\b`);

export interface ParsedPlate {
  /** The matched plate substring, e.g. "A123BC777", for a brief on-screen confirmation. */
  plate: string;
  /** The extracted region code, capped at 3 digits. */
  code: string;
}

export function parsePlate(text: string): ParsedPlate | null {
  const normalized = Array.from(text.toUpperCase())
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");
  const match = normalized.match(PLATE_RE);
  if (!match) return null;
  return { plate: match[0].replace(/\s+/g, ""), code: match[1].slice(0, 3) };
}
