"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { useHeatmapData, useSkillGaps } from "@/lib/hooks/useDashboard";
import type { SkillGapScore } from "@/lib/types";
import { Map as MapIcon, X } from "lucide-react";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false }
);

const STATES = [
  "Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Gujarat",
  "Delhi", "West Bengal", "Uttar Pradesh", "Rajasthan",
];
const SECTORS = ["IT", "Healthcare", "Manufacturing", "Agriculture"];

function gapColor(gap: number): string {
  if (gap >= 75) return "#dc2626";
  if (gap >= 55) return "#f59e0b";
  if (gap >= 35) return "#facc15";
  return "#22c55e";
}

function gapBadge(score: number) {
  if (score >= 75) return "bg-red-100 text-red-700";
  if (score >= 55) return "bg-amber-100 text-amber-700";
  if (score >= 35) return "bg-yellow-100 text-yellow-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function HeatmapPage() {
  useRequireAuth("gov_admin");
  const [state, setState] = useState("");
  const [sector, setSector] = useState("");
  const { data: heatmapData, loading: heatmapLoading } = useHeatmapData(
    state || undefined
  );
  const { data: skillGaps, loading: gapsLoading } = useSkillGaps(
    state || ""
  );

  const loading = heatmapLoading || gapsLoading;

  const filteredGaps = useMemo(() => {
    if (!sector) return skillGaps;
    return skillGaps.filter((g) => g.sector === sector);
  }, [skillGaps, sector]);

  const points = useMemo(
    () => heatmapData.filter((p) => p.lat != null && p.lng != null),
    [heatmapData]
  );

  const stats = useMemo(() => {
    const districtCount = points.length;
    const avgGap =
      points.length > 0
        ? Math.round(
            points.reduce((sum, p) => sum + p.avg_gap_score, 0) /
              points.length
          )
        : 0;
    const highDeficit = points.filter((p) => p.avg_gap_score >= 75).length;
    return { districtCount, avgGap, highDeficit };
  }, [points]);

  const topDeficitsByDistrict = useMemo(() => {
    const grouped: { district: string; skills: SkillGapScore[] }[] = [];
    const idx = new Map<string, number>();
    for (const g of filteredGaps) {
      if (g.gap_direction !== "deficit") continue;
      const key = g.district ?? g.state;
      if (idx.has(key)) {
        grouped[idx.get(key)!].skills.push(g);
      } else {
        idx.set(key, grouped.length);
        grouped.push({ district: key, skills: [g] });
      }
    }
    return grouped
      .sort((a: { district: string; skills: SkillGapScore[] }, b: { district: string; skills: SkillGapScore[] }) => b.skills.length - a.skills.length)
      .slice(0, 12);
  }, [filteredGaps]);

  const hasFilters = state !== "" || sector !== "";

  function clearFilters() {
    setState("");
    setSector("");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Regional Skill Gap Heatmap" />
        <main className="p-6">
          <div className="glass p-6 overflow-hidden animate-fade-up">
            <div className="p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 items-center">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="input-glass w-auto"
                >
                  <option value="">All States</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="input-glass w-auto"
                >
                  <option value="">All Sectors</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    <X className="h-3 w-3" />
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-600" />
                  <span>High Deficit (75+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span>Moderate (55–74)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-400" />
                  <span>Low (35–54)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Balanced (&lt;35)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
              <div className="relative h-[600px] rounded-xl overflow-hidden bg-slate-100">
                {points.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="glass-inner text-center text-slate-400 p-6">
                      <MapIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-lg font-medium">
                        {loading
                          ? "Loading heatmap data…"
                          : "No gap data for selected filters"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <MapContainer
                    center={[22.9734, 78.6569]}
                    zoom={5}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {points.map((p, i) => (
                      <CircleMarker
                        key={`${p.district}-${i}`}
                        center={[p.lat as number, p.lng as number]}
                        radius={Math.max(
                          6,
                          (p.avg_gap_score / 100) * 28
                        )}
                        pathOptions={{
                          color: gapColor(p.avg_gap_score),
                          fillColor: gapColor(p.avg_gap_score),
                          fillOpacity: 0.55,
                          weight: 1,
                        }}
                      >
                        <Tooltip>
                          <div className="text-xs">
                            <p className="font-semibold">
                              {p.district ?? p.state}
                            </p>
                            <p>Avg Gap: {p.avg_gap_score}</p>
                            {p.top_deficit_skills.length > 0 && (
                              <p>
                                Deficits:{" "}
                                {p.top_deficit_skills.join(", ")}
                              </p>
                            )}
                          </div>
                        </Tooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-inner p-3 text-center">
                    <p className="text-xl font-bold text-slate-800">
                      {stats.districtCount}
                    </p>
                    <p className="text-xs text-slate-500">Districts</p>
                  </div>
                  <div className="glass-inner p-3 text-center">
                    <p className="text-xl font-bold text-slate-800">
                      {stats.avgGap}
                    </p>
                    <p className="text-xs text-slate-500">Avg Gap</p>
                  </div>
                  <div className="glass-inner p-3 text-center">
                    <p className="text-xl font-bold text-rose-600">
                      {stats.highDeficit}
                    </p>
                    <p className="text-xs text-slate-500">
                      High Deficit
                    </p>
                  </div>
                </div>

                <div className="glass-inner p-4 flex-1 overflow-y-auto max-h-[480px]">
                  <h4 className="panel-title mb-3">
                    Top Deficit Skills
                  </h4>
                  {!state ? (
                    <p className="text-xs text-slate-400">
                      Select a state to view per-district skill deficits.
                    </p>
                  ) : loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton h-14" />
                      ))}
                    </div>
                  ) : topDeficitsByDistrict.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No deficit skills{sector ? ` in ${sector}` : ""} for
                      this state.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topDeficitsByDistrict.map((d) => (
                        <div
                          key={d.district}
                          className="rounded-lg border border-slate-100 bg-white/60 p-3"
                        >
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            {d.district}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {d.skills
                              .sort((a, b) => b.gap_score - a.gap_score)
                              .slice(0, 5)
                              .map((s) => (
                                <span
                                  key={s.skill_name}
                                  className={`chip text-xs ${gapBadge(s.gap_score)}`}
                                >
                                  {s.skill_name} ({s.gap_score})
                                </span>
                              ))}
                            {d.skills.length > 5 && (
                              <span className="text-xs text-slate-400">
                                +{d.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
