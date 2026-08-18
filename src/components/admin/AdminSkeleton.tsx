import { Skeleton } from "../ui/Skeleton";
import { Card, CardContent, CardFooter } from "../ui/Card";
import { PageHeader } from "./PageHeader";

export function AdminListSkeleton({ title, count = 3 }: { title: string, count?: number }) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title={title} action={<Skeleton className="w-24 h-10 rounded-md" />} />
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Skeleton className="w-48 h-6 mb-2" />
                  <Skeleton className="w-64 h-4" />
                </div>
                <div className="space-x-3 flex">
                  <Skeleton className="w-20 h-10 rounded-md" />
                  <Skeleton className="w-20 h-10 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-full h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminGridSkeleton({ title, count = 6 }: { title: string, count?: number }) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title={title} action={<Skeleton className="w-24 h-10 rounded-md" />} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <Skeleton className="w-full h-48 rounded-t-md" />
            <CardContent className="flex-1 flex flex-col justify-between p-4 space-y-4">
              <div>
                <Skeleton className="w-32 h-6 mb-2" />
                <Skeleton className="w-24 h-4" />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-16 h-8 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminFormSkeleton({ title, fields = 5 }: { title: string, fields?: number }) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title={title} />
      <Card>
        <CardContent className="space-y-6">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Skeleton className="w-32 h-10 rounded-md" />
        </CardFooter>
      </Card>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Skeleton className="w-12 h-12 rounded-full mx-auto mb-6" />
        <Skeleton className="w-48 h-8 mx-auto mb-2" />
        <Skeleton className="w-64 h-4 mx-auto" />
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
            <div>
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
            <Skeleton className="w-full h-10 rounded-md mt-4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
