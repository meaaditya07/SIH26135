"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

const schemes = [
  { id: "PMKVY-4.0", enrolled: 12450, completed: 11200, placed12m: 8234, cpp: 2150, roi: 3.2, retention: 73, fit: 88 },
  { id: "DDU-GKY", enrolled: 8900, completed: 7650, placed12m: 5120, cpp: 2890, roi: 2.1, retention: 58, fit: 65 },
  { id: "NRLM", enrolled: 6700, completed: 5200, placed12m: 3890, cpp: 3200, roi: 1.4, retention: 45, fit: 52 },
  { id: "PM-KVK", enrolled: 3400, completed: 3100, placed12m: 2100, cpp: 1800, roi: 4.1, retention: 82, fit: 91 },
  { id: "NSDC-IT", enrolled: 5600, completed: 4800, placed12m: 3200, cpp: 2400, roi: 2.8, retention: 67, fit: 76 },
];

export default function SchemeROIPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Scheme ROI Analysis" />
        <main className="p-6">
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Scheme Performance Overview</h3>
              <button className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700">
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Scheme</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Enrolled</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completed</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Placed (12m)</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">CPP (INR)</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">ROI Score</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Retention</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Curriculum Fit</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.id}</td>
                      <td className="px-4 py-3 text-right">{s.enrolled.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{s.completed.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{s.placed12m.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">INR {s.cpp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${s.roi >= 3 ? "text-green-600" : s.roi >= 2 ? "text-amber-600" : "text-red-600"}`}>
                          {s.roi}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{s.retention}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                            <div className={`h-1.5 rounded-full ${s.fit >= 80 ? "bg-green-500" : s.fit >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${s.fit}%` }} />
                          </div>
                          <span className="text-xs">{s.fit}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
