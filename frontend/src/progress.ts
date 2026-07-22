import regionsData from "./data/regions.json";
import type { ProgressOut, RegionOut } from "./types";

interface RegionRef {
  name: string;
  federal_district: string;
  map_id: string;
  codes: string[];
}

const REGIONS = regionsData as RegionRef[];

const FOUND_CODES_KEY = "auto-bingo-found-codes";

function loadFoundCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(FOUND_CODES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFoundCodes(codes: Set<string>): void {
  localStorage.setItem(FOUND_CODES_KEY, JSON.stringify([...codes]));
}

function buildProgress(foundCodes: Set<string>): ProgressOut {
  let totalCodes = 0;
  let totalFound = 0;
  let regionsStarted = 0;

  const regions: RegionOut[] = REGIONS.map((region, index) => {
    const codeOuts = region.codes.map((code) => ({
      code,
      found: foundCodes.has(code),
    }));
    const foundCount = codeOuts.filter((c) => c.found).length;
    const fullyFound = region.codes.length > 0 && foundCount === region.codes.length;
    if (foundCount > 0) regionsStarted++;
    totalCodes += region.codes.length;
    totalFound += foundCount;

    return {
      id: index + 1,
      name: region.name,
      federal_district: region.federal_district,
      map_id: region.map_id,
      codes: codeOuts,
      total_codes: region.codes.length,
      found_codes: foundCount,
      fully_found: fullyFound,
    };
  });

  return {
    total_codes: totalCodes,
    found_codes: totalFound,
    total_regions: regions.length,
    fully_found_regions: regionsStarted,
    regions,
  };
}

export const progressStore = {
  getProgress(): ProgressOut {
    return buildProgress(loadFoundCodes());
  },

  setCodeFound(code: string, found: boolean): ProgressOut {
    const codes = loadFoundCodes();
    if (found) {
      codes.add(code);
    } else {
      codes.delete(code);
    }
    saveFoundCodes(codes);
    return buildProgress(codes);
  },
};
