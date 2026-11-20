export function PageSuspenseSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 animate-pulse">
      <div className="h-14 border-b border-zinc-200 bg-white px-4">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between">
          <div className="h-6 w-28 rounded-lg bg-zinc-200/70" />
          <div className="h-8 w-24 rounded-xl bg-zinc-200/70" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <div className="h-28 rounded-2xl bg-zinc-200/70" />
        <div className="h-44 rounded-2xl bg-zinc-200/70" />
      </div>
    </div>
  );
}

export function StorePageSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 pb-20 animate-pulse">
      <div className="bg-zinc-200/80 px-4 py-7">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-300/80" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-44 rounded-lg bg-zinc-300/80" />
            <div className="h-3.5 w-56 rounded-lg bg-zinc-300/70" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <div className="h-20 rounded-2xl border border-zinc-200/70 bg-white p-4">
          <div className="h-3 w-36 rounded bg-zinc-200/70" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-28 rounded-lg bg-zinc-200/70" />
            <div className="h-6 w-24 rounded-lg bg-zinc-200/70" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-3 w-32 rounded bg-zinc-200/70" />
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex gap-3 rounded-2xl border border-zinc-200/70 bg-white p-3.5"
            >
              <div className="h-24 w-24 shrink-0 rounded-xl bg-zinc-200/70" />
              <div className="flex flex-1 flex-col justify-between py-0.5">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-zinc-200/70" />
                  <div className="h-3 w-full rounded bg-zinc-200/70" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-zinc-200/70" />
                  <div className="h-7 w-24 rounded-full bg-zinc-200/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 animate-pulse">
      <div className="bg-zinc-200/80 px-4 py-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-zinc-300/80" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-zinc-300/80" />
              <div className="h-4 w-40 rounded bg-zinc-300/80" />
            </div>
          </div>
          <div className="h-6 w-14 rounded-full bg-zinc-300/80" />
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5">
          <div className="flex justify-between">
            <div className="h-4 w-28 rounded bg-zinc-200/70" />
            <div className="h-7 w-20 rounded-xl bg-zinc-200/70" />
          </div>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-zinc-200/70" />
                <div className="h-3 w-12 rounded bg-zinc-200/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-3">
          <div className="h-4 w-32 rounded bg-zinc-200/70" />
          <div className="h-4 w-full rounded bg-zinc-200/70" />
          <div className="h-4 w-5/6 rounded bg-zinc-200/70" />
          <div className="h-5 w-24 rounded bg-zinc-200/70 pt-2" />
        </div>
      </div>
    </div>
  );
}

export function ManagePageSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 animate-pulse">
      <div className="h-16 border-b border-zinc-200 bg-white px-4">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 rounded-lg bg-zinc-200/70" />
            <div className="h-6 w-40 rounded-lg bg-zinc-200/70" />
          </div>
          <div className="h-8 w-28 rounded-xl bg-zinc-200/70" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-white p-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-10 rounded-xl bg-zinc-200/70" />
          ))}
        </div>
        <OrdersListSkeleton />
      </div>
    </div>
  );
}

export function OrdersListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="rounded-2xl border border-zinc-200/70 bg-white p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-zinc-200/70" />
              <div className="h-3 w-48 rounded bg-zinc-200/70" />
            </div>
            <div className="h-5 w-20 rounded bg-zinc-200/70" />
          </div>
          <div className="h-14 rounded-xl bg-zinc-200/50" />
          <div className="flex gap-2">
            <div className="h-7 w-28 rounded-xl bg-zinc-200/70" />
            <div className="h-7 w-24 rounded-xl bg-zinc-200/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-zinc-200/70 bg-white p-4 space-y-2.5"
          >
            <div className="h-3.5 w-20 rounded bg-zinc-200/70" />
            <div className="h-6 w-24 rounded bg-zinc-200/70" />
            <div className="h-3 w-16 rounded bg-zinc-200/70" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-3"
          >
            <div className="h-4 w-40 rounded bg-zinc-200/70" />
            <div className="h-8 rounded-lg bg-zinc-200/60" />
            <div className="h-8 rounded-lg bg-zinc-200/60" />
            <div className="h-8 rounded-lg bg-zinc-200/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyCatalogsSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 animate-pulse">
      <div className="h-16 border-b border-zinc-200 bg-white px-4">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between">
          <div className="h-8 w-28 rounded-lg bg-zinc-200/70" />
          <div className="h-8 w-32 rounded-xl bg-zinc-200/70" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-5">
        <div className="h-7 w-48 rounded-lg bg-zinc-200/70" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-200/70" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-36 rounded bg-zinc-200/70" />
                  <div className="h-3 w-28 rounded bg-zinc-200/70" />
                </div>
              </div>
              <div className="h-9 rounded-xl bg-zinc-200/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-4">
        <div className="flex justify-between">
          <div className="h-5 w-48 rounded bg-zinc-200/70" />
          <div className="h-6 w-36 rounded-full bg-zinc-200/70" />
        </div>
        <div className="h-3 w-full rounded-full bg-zinc-200/70" />
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} className="h-14 rounded-xl bg-zinc-200/70" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-zinc-200/70 bg-white p-4 space-y-2"
          >
            <div className="h-3.5 w-24 rounded bg-zinc-200/70" />
            <div className="h-6 w-28 rounded bg-zinc-200/70" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-3">
        <div className="h-4 w-44 rounded bg-zinc-200/70" />
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-8 rounded bg-zinc-200/60" />
        ))}
      </div>
    </div>
  );
}

export function MyOrdersSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 animate-pulse">
      <div className="h-16 border-b border-zinc-200 bg-white px-4">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-between">
          <div className="h-8 w-28 rounded-lg bg-zinc-200/70" />
          <div className="h-8 w-32 rounded-xl bg-zinc-200/70" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <div className="h-7 w-44 rounded-lg bg-zinc-200/70" />
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 rounded bg-zinc-200/70" />
              <div className="h-5 w-20 rounded-full bg-zinc-200/70" />
            </div>
            <div className="h-10 rounded-xl bg-zinc-200/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
