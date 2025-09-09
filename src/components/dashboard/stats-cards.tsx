import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function StatsCards() {
  const session = await auth();
  
  if (!session) return null;

  const [totalForms, totalSubmissions, activeForms] = await Promise.all([
    prisma.form.count({
      where: { createdById: session.user.id }
    }),
    prisma.submission.count({
      where: { 
        form: { createdById: session.user.id }
      }
    }),
    prisma.form.count({
      where: { 
        createdById: session.user.id,
        isActive: true
      }
    })
  ]);

  const stats = [
    {
      title: "Total Forms",
      value: totalForms,
      description: "Forms you've created",
    },
    {
      title: "Total Submissions",
      value: totalSubmissions,
      description: "Responses received",
    },
    {
      title: "Active Forms",
      value: activeForms,
      description: "Currently accepting responses",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}