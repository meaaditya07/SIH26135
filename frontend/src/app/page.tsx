import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-brand-700 mb-4">SkillTrace AI</h1>
        <p className="text-lg text-slate-600 mb-8">
          Vocational Education Outcome Tracking & Labor Analytics Platform
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          <Link
            href="/gov"
            className="rounded-lg border border-brand-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-brand-700 mb-1">Government Portal</h3>
            <p className="text-sm text-slate-500">Heatmaps, scheme ROI, policy alerts</p>
          </Link>

          <Link
            href="/partner"
            className="rounded-lg border border-brand-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-brand-700 mb-1">Training Partner</h3>
            <p className="text-sm text-slate-500">Student outcomes, curriculum gaps</p>
          </Link>

          <Link
            href="/employer"
            className="rounded-lg border border-brand-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-brand-700 mb-1">Employer Portal</h3>
            <p className="text-sm text-slate-500">Job matches, candidate discovery</p>
          </Link>

          <Link
            href="/candidate"
            className="rounded-lg border border-brand-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-brand-700 mb-1">Candidate Portal</h3>
            <p className="text-sm text-slate-500">Verification, skills, job matches</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
