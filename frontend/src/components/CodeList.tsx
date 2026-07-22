import { useMemo, useState } from "react";
import type { RegionOut } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  regions: RegionOut[];
  onToggleCode: (code: string, nextFound: boolean) => void;
  showCompleted: boolean;
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

const CONFIRM_DELAY_MS = 200;

export function CodeList({ regions, onToggleCode, showCompleted, filter }: Props) {
  // pendingCode drives the visual unhighlight immediately on click.
  // confirmCode drives the dialog, shown only after a short delay so the
  // unhighlight is visible on its own before the dialog appears on top.
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState<string | null>(null);

  const filteredRegions = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return regions.filter((r) => {
      if (!showCompleted && r.fully_found) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.codes.some((c) => c.code.startsWith(q));
    });
  }, [regions, filter, showCompleted]);

  const groups = useMemo(() => groupByDistrict(filteredRegions), [filteredRegions]);

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
      {Array.from(groups.entries()).map(([district, districtRegions]) => (
        <section key={district} className="district-group">
          <h2>{district}</h2>
          {districtRegions.map((region) => (
            <div key={region.id} className="region-row">
              <div className="region-row-header">
                <span className={`region-name${region.fully_found ? " fully-found" : ""}`}>
                  {region.name}
                </span>
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
                          onClick={() => handleChipClick(c.code, c.found)}
                        >
                          {c.code}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
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
