const UNIT_WORDS: Record<string, string> = {
  ноль: "0",
  один: "1",
  одна: "1",
  два: "2",
  две: "2",
  три: "3",
  четыре: "4",
  пять: "5",
  шесть: "6",
  семь: "7",
  восемь: "8",
  девять: "9",
};

const TENS_WORDS: Record<string, number> = {
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
  тринадцать: 13,
  четырнадцать: 14,
  пятнадцать: 15,
  шестнадцать: 16,
  семнадцать: 17,
  восемнадцать: 18,
  девятнадцать: 19,
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  пятьдесят: 50,
  шестьдесят: 60,
  семьдесят: 70,
  восемьдесят: 80,
  девяносто: 90,
};

const HUNDREDS_WORDS: Record<string, number> = {
  сто: 100,
  двести: 200,
  триста: 300,
  четыреста: 400,
  пятьсот: 500,
  шестьсот: 600,
  семьсот: 700,
  восемьсот: 800,
  девятьсот: 900,
};

/**
 * Parses a single grammatically valid Russian cardinal number phrase
 * (at most one hundreds word, then one tens/teens word, then one unit word).
 * Returns null if the words don't fit that shape, e.g. digit-by-digit speech
 * like "семь семь" (which has two consecutive unit words).
 */
function parseCompoundNumber(words: string[]): number | null {
  let total = 0;
  let stage = 0; // 0: expect hundreds/tens/unit, 1: expect tens/unit, 2: expect unit, 3: done
  for (const word of words) {
    if (stage <= 0 && word in HUNDREDS_WORDS) {
      total += HUNDREDS_WORDS[word];
      stage = 1;
      continue;
    }
    if (stage <= 1 && word in TENS_WORDS) {
      const value = TENS_WORDS[word];
      total += value;
      stage = value < 20 ? 3 : 2;
      continue;
    }
    if (stage <= 2 && word in UNIT_WORDS) {
      total += Number(UNIT_WORDS[word]);
      stage = 3;
      continue;
    }
    return null;
  }
  return stage === 0 ? null : total;
}

export function parseSpokenCode(text: string): string {
  const digitsOnly = text.replace(/\D/g, "");
  if (digitsOnly) return digitsOnly.slice(0, 3);

  const words = text
    .toLowerCase()
    .split(/[^а-яё]+/)
    .filter(Boolean);
  if (words.length === 0) return "";

  const compound = parseCompoundNumber(words);
  if (compound !== null) return String(compound).slice(0, 3);

  const digitWords = words
    .map((word) => UNIT_WORDS[word])
    .filter((digit): digit is string => digit !== undefined);
  return digitWords.join("").slice(0, 3);
}
