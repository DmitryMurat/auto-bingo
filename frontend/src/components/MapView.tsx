import { geoMercator, geoPath } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
import regionsGeo from "../data/russia-regions.geo.json";
import { SHOW_DEBUG_UI } from "../debug";
import type { RegionOut } from "../types";

interface Props {
  regions: RegionOut[];
}

const WIDTH = 960;
const HEIGHT = 520;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function regionFill(region: RegionOut | undefined): string {
  if (!region || region.found_codes === 0) return "var(--map-empty)";
  if (region.fully_found) return "var(--map-full)";
  return "var(--map-partial)";
}

function touchDistance(touches: TouchList): number {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function MapView({ regions }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const scaleRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(
    null,
  );
  const [debug, setDebug] = useState({
    mounted: false,
    event: "none",
    touches: 0,
    scale: 1,
  });

  const regionByMapId = useMemo(() => {
    const map = new Map<string, RegionOut>();
    for (const r of regions) map.set(r.map_id, r);
    return map;
  }, [regions]);

  const geoData = regionsGeo as GeoJSON.FeatureCollection;

  const pathGenerator = useMemo(() => {
    // Конус и азимутальная проекция дают заметный изгиб/наклон на такой
    // долготной ширине (170°+) — визуально хуже, чем растянутый Меркатор,
    // к которому все привыкли по Google/Яндекс.Картам.
    const projection = geoMercator()
      .rotate([-100, 0])
      .fitSize([WIDTH - 20, HEIGHT - 20], geoData);
    return geoPath(projection);
  }, [geoData]);

  function resetView() {
    scaleRef.current = 1;
    panOffsetRef.current = { x: 0, y: 0 };
    pinchRef.current = null;
    dragRef.current = null;
    if (svgRef.current) svgRef.current.style.transform = "scale(1)";
    if (panRef.current) panRef.current.style.transform = "translate(0px, 0px)";
    setDebug((d) => ({ ...d, scale: 1 }));
  }

  useEffect(() => {
    const wrap = wrapRef.current;
    const pan = panRef.current;
    const svg = svgRef.current;
    if (!wrap || !pan || !svg) {
      setDebug((d) => ({ ...d, event: "no-ref" }));
      return;
    }
    setDebug((d) => ({ ...d, mounted: true, event: "listeners-attached" }));

    function startDrag(touch: Touch) {
      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startPanX: panOffsetRef.current.x,
        startPanY: panOffsetRef.current.y,
      };
    }

    function onTouchStart(e: TouchEvent) {
      setDebug((d) => ({ ...d, event: "touchstart", touches: e.touches.length }));
      if (e.touches.length === 1) {
        pinchRef.current = null;
        startDrag(e.touches[0]);
      } else if (e.touches.length === 2) {
        dragRef.current = null;
        pinchRef.current = { startDist: touchDistance(e.touches), startScale: scaleRef.current };
        const rect = wrap!.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        svg!.style.transformOrigin = `${(midX / rect.width) * 100}% ${(midY / rect.height) * 100}%`;
      }
    }

    function onTouchMove(e: TouchEvent) {
      setDebug((d) => ({ ...d, event: "touchmove", touches: e.touches.length }));
      if (e.touches.length === 1 && dragRef.current) {
        e.preventDefault();
        const touch = e.touches[0];
        const next = {
          x: dragRef.current.startPanX + (touch.clientX - dragRef.current.startX),
          y: dragRef.current.startPanY + (touch.clientY - dragRef.current.startY),
        };
        panOffsetRef.current = next;
        pan!.style.transform = `translate(${next.x}px, ${next.y}px)`;
      } else if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dist = touchDistance(e.touches);
        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, (dist / pinchRef.current.startDist) * pinchRef.current.startScale),
        );
        scaleRef.current = next;
        svg!.style.transform = `scale(${next})`;
        setDebug((d) => ({ ...d, scale: next }));
      }
    }

    function onTouchEnd(e: TouchEvent) {
      setDebug((d) => ({ ...d, event: "touchend", touches: e.touches.length }));
      if (e.touches.length === 1) {
        // шли двумя пальцами, один подняли — продолжаем как перетаскивание
        pinchRef.current = null;
        startDrag(e.touches[0]);
      } else if (e.touches.length === 0) {
        pinchRef.current = null;
        dragRef.current = null;
      }
    }

    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    wrap.addEventListener("touchend", onTouchEnd);
    wrap.addEventListener("touchcancel", onTouchEnd);

    return () => {
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove", onTouchMove);
      wrap.removeEventListener("touchend", onTouchEnd);
      wrap.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div className="map-outer">
      <div className="map-zoom-wrap" ref={wrapRef}>
        <div className="map-pan" ref={panRef}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Карта регионов России"
            style={{ width: "100%", height: "auto" }}
          >
            <g transform="translate(10, 10)">
              {geoData.features.map((feature) => {
                const mapId = feature.properties?.map_id as string;
                const region = regionByMapId.get(mapId);
                const d = pathGenerator(feature) ?? undefined;
                return (
                  <path
                    key={mapId}
                    d={d}
                    fill={regionFill(region)}
                    stroke="var(--map-border)"
                    strokeWidth={0.5}
                  >
                    <title>
                      {region ? `${region.name}: ${region.found_codes}/${region.total_codes}` : mapId}
                    </title>
                  </path>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
      <button
        type="button"
        className="map-reset-btn"
        aria-label="Сбросить масштаб и положение карты"
        onClick={resetView}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 12a8 8 0 1 1 2.34 5.66"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 17v-4h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {SHOW_DEBUG_UI && (
        <div className="map-debug">
          mounted:{String(debug.mounted)} event:{debug.event} touches:{debug.touches} scale:
          {debug.scale.toFixed(2)}
        </div>
      )}
    </div>
  );
}
