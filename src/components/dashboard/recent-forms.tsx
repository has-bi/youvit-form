import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export async function RecentForms() {
  const session = await auth();
  
  if (!session) return null;

  const recentForms = await prisma.form.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { submissions: true }
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Forms</CardTitle>
          <Button asChild size="sm">
            <Link href="/forms/new">Create New Form</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentForms.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No forms created yet</p>
            <Button asChild className="mt-4">
              <Link href="/forms/new">Create Your First Form</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {recentForms.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{form.title}</h3>
                    <Badge variant={form.isActive ? "default" : "secondary"}>
                      {form.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{form._count.submissions} responses</span>
                    <span>
                      Created {formatDistanceToNow(form.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/forms/${form.id}`}>View</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/forms/${form.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}