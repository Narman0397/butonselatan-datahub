export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function NoAccess() {
  return <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
}
