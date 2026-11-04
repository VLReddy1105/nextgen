export default function DashboardLoading() {
  return <section aria-busy="true" aria-label="Loading page" className="space-y-5">
    <div className="h-10 w-2/3 rounded-xl bg-slate-100" />
    <div className="h-36 rounded-2xl bg-slate-100" />
    <p role="status" className="text-sm text-slate-500">Loading page…</p>
  </section>;
}
