import { useMemo, useState } from "react";
import type { RegionOut, SortMode } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  regions: RegionOut[];
  onToggleCode: (code: string, nextFound: boolean) => void;
  sortMode: SortMode;
  filter: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function groupByDistrict(regions: RegionOut[]): Map<string, RegionOut[]> {
  const map = new Map<string, RegionOut[]>();
  for (const region of regions) {
    const list = map.get(region.federal_district);
    if (list) {
      list.push(region);
    } else {
      map.set(region.federal_district, [region]);
    }
  }
  return map;
}

function firstRegionCode(region: RegionOut): number {
  const code = region.codes[0]?.code;
  return code ? Number(code) : 0;
}

const CONFIRM_DELAY_MS = 200;

function RegionRow({
  region,
  pendingCode,
  onChipClick,
}: {
  region: RegionOut;
  pendingCode: string | null;
  onChipClick: (code: string, found: boolean) => void;
}) {
  return (
    <div className="region-row">
      <div className="region-row-header">
        <span className={`region-name${region.fully_found ? " fully-found" : ""}`}>{region.name}</span>
        <span className="region-progress">
          {region.found_codes}/{region.total_codes}
        </span>
      </div>
      <div className="code-chips-group">
        {chunk(region.codes, 5).map((row, i) => (
          <div key={i} className="code-chips">
            {row.map((c) => {
              const isFound = c.found && c.code !== pendingCode;
              return (
                <button
                  key={c.code}
                  type="button"
                  className={`code-chip${isFound ? " found" : ""}`}
                  onClick={() => onChipClick(c.code, c.found)}
                >
                  {c.code}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CodeList({ regions, onToggleCode, sortMode, filter }: Props) {
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState<string | null>(null);

  const filteredRegions = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter(
      (r) => r.name.toLowerCase().includes(q) || r.codes.some((c) => c.code.startsWith(q)),
    );
  }, [regions, filter]);

  const districtGroups = useMemo(() => {
    if (sortMode !== "district") return null;
    return groupByDistrict(filteredRegions);
  }, [filteredRegions, sortMode]);

  const flatRegions = useMemo(() => {
    if (sortMode === "district") return null;
    const sorted = [...filteredRegions];
    if (sortMode === "alphabetical") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    } else {
      sorted.sort((a, b) => firstRegionCode(a) - firstRegionCode(b));
    }
    return sorted;
  }, [filteredRegions, sortMode]);

  function handleChipClick(code: string, found: boolean) {
    if (found) {
      setPendingCode(code);
      window.setTimeout(() => setConfirmCode(code), CONFIRM_DELAY_MS);
    } else {
      onToggleCode(code, true);
    }
  }

  function handleCancel() {
    setConfirmCode(null);
    setPendingCode(null);
  }

  function handleConfirm() {
    if (confirmCode) onToggleCode(confirmCode, false);
    setConfirmCode(null);
    setPendingCode(null);
  }

  return (
    <div className="code-list">
      {districtGroups &&
        Array.from(districtGroups.entries()).map(([district, districtRegions]) => (
          <section key={district} className="district-group">
            <h2>{district}</h2>
            {districtRegions.map((region) => (
              <RegionRow
                key={region.id}
                region={region}
                pendingCode={pendingCode}
                onChipClick={handleChipClick}
              />
            ))}
          </section>
        ))}
      {flatRegions && (
        <section className="district-group district-group-flat">
          {flatRegions.map((region) => (
            <RegionRow
              key={region.id}
              region={region}
              pendingCode={pendingCode}
              onChipClick={handleChipClick}
            />
          ))}
        </section>
      )}
      {filteredRegions.length === 0 && <p className="empty-hint">Ничего не найдено</p>}
      {confirmCode && (
        <ConfirmDialog
          message="Вы точно хотите снять отметку?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
