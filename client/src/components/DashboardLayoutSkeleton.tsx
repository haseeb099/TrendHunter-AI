import { Skeleton } from "./ui/skeleton";

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden md:flex w-[15.5rem] shrink-0 flex-col border-r border-border bg-sidebar p-4">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
        <div className="space-y-6 flex-1">
          {[1, 2, 3].map((group) => (
            <div key={group} className="space-y-2">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg mt-auto" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b border-border px-6 flex items-center">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
