import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 mt-2 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Warning Skeleton */}
      <Skeleton className="h-14 w-full rounded-lg" />

      {/* Table Skeleton */}
      <div className="bg-white border rounded-lg shadow-sm">
        {/* Filtering Skeleton */}
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>
        
        {/* Table Rows Skeleton */}
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-20 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}