"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useHeatmapData } from "@/lib/hooks/useDashboard";

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

export default function HeatmapPage() {
  const [state, setState] = useState("");
  const [sector, setSector] = useState("");
  const { data, loading } = useHeatmapData(state || undefined, sector || undefined);

  const points = data.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Regional Skill Gap Heatmap" />
        <main className="p-6">
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="">All States</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="">All Sectors</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
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

            <div className="relative h-[600px] bg-slate-100">
              {points.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-slate-400 bg-white/80 rounded-lg p-6">
                    <p className="text-lg font-medium">
                      {loading ? "Loading heatmap data…" : "No gap data for selected filters"}
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
                      radius={Math.max(6, (p.avg_gap_score / 100) * 28)}
                      pathOptions={{
                        color: gapColor(p.avg_gap_score),
                        fillColor: gapColor(p.avg_gap_score),
                        fillOpacity: 0.55,
                        weight: 1,
                      }}
                    >
                      <Tooltip>
                        <div className="text-xs">
                          <p className="font-semibold">{p.district ?? p.state}</p>
                          <p>Avg Gap: {p.avg_gap_score}</p>
                          {p.top_deficit_skills.length > 0 && (
                            <p>Deficits: {p.top_deficit_skills.join(", ")}</p>
                          )}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
