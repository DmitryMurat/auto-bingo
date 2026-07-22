import { useEffect, useRef, useState } from "react";
import type { SortMode } from "../types";

const OPTIONS: { value: SortMode; label: string }[] = [
  { value: "district", label: "Федеральные округа" },
  { value: "alphabetical", label: "Алфавитный порядок" },
  { value: "code", label: "Коды регионов" },
];

interface Props {
  value: SortMode;
  onChange: (value: SortMode) => void;
}

export function SortSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div className="sort-select" ref={rootRef}>
      <button
        type="button"
        className="sort-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Сортировка регионов"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sort-select-value">{current.label}</span>
        <svg
          className="sort-select-icon"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul className="sort-select-menu" role="listbox" aria-label="Сортировка регионов">
          {OPTIONS.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`sort-select-option${opt.value === value ? " selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
