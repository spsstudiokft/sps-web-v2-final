import { Skeleton } from "../ui/Skeleton";

export function PublicSkeleton() {
  return (
    <div className="font-sans antialiased text-slate-900 min-h-screen">
      {/* Header Skeleton */}
      <header className="fixed w-full top-0 bg-white/80 border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-32 h-6" />
          </div>
          <div className="hidden md:flex gap-8">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-16 h-4" />
          </div>
        </div>
      </header>

      {/* Hero Skeleton */}
      <section className="pt-48 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <Skeleton className="h-16 md:h-20 w-3/4 max-w-3xl mb-6" />
        <Skeleton className="h-16 md:h-20 w-2/3 max-w-2xl mb-8" />
        <Skeleton className="h-6 w-1/2 max-w-xl mb-12" />
        <div className="flex gap-4">
          <Skeleton className="w-40 h-14 rounded-full" />
          <Skeleton className="w-40 h-14 rounded-full" />
        </div>
      </section>

      {/* Vision Skeleton */}
      <section className="py-20 md:py-32 px-6 max-w-4xl mx-auto text-center border-t border-slate-100">
        <Skeleton className="h-10 md:h-12 w-full mb-8" />
        <Skeleton className="h-10 md:h-12 w-4/5 mx-auto mb-8" />
      </section>

      {/* Featured Work Skeleton */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-[4/3] w-full rounded-sm" />
          <Skeleton className="aspect-[4/3] w-full rounded-sm" />
        </div>
      </section>
      
      {/* About Skeleton */}
      <section className="bg-slate-50 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Skeleton className="w-48 h-10 mb-6" />
            <Skeleton className="w-full h-4 mb-4" />
            <Skeleton className="w-full h-4 mb-4" />
            <Skeleton className="w-3/4 h-4 mb-4" />
          </div>
          <Skeleton className="aspect-square w-full rounded-sm" />
        </div>
      </section>
    </div>
  );
}
