"use client";

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

type Tone = "success" | "error" | "info";

interface ToastProps {
  message: string;
  tone?: Tone;
}

export default function Toast({ message, tone = "info" }: ToastProps) {
  const tones: Record<Tone, string> = {
    success: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    error: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    info: "bg-violet-500/25 text-violet-100 border-violet-400/40",
  };
  const icons: Record<Tone, typeof CheckCircle2> = {
    success: CheckCircle2,
    error: XCircle,
    info: AlertCircle,
  };
  const Icon = icons[tone];

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-black/30 backdrop-blur-xl animate-fade-in ${tones[tone]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
