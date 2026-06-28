// Minimalist Skeleton Loader
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-neutral-100 ${className}`} />
  );
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-3 w-full ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="border border-zara-gray-border p-6 space-y-4">
      <Skeleton className="h-4 w-1/4" />
      <div className="space-y-2">
        <SkeletonText className="w-full" />
        <SkeletonText className="w-5/6" />
        <SkeletonText className="w-2/3" />
      </div>
    </div>
  );
}
