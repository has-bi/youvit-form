import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText,
  Calendar,
  Activity,
  Download,
  Eye,
  Clock
} from "lucide-react"
import Link from "next/link"

export default async function AnalyticsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  // Get comprehensive analytics data
  const [
    totalForms,
    totalSubmissions, 
    totalUsers,
    formAnalytics,
    submissionTrends,
    topForms,
    recentActivity
  ] = await Promise.all([
    prisma.form.count(),
    prisma.submission.count(),
    prisma.user.count(),
    prisma.form.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        isActive: true,
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Get submission trends by day for the last 30 days
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM submissions 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
    // Get top performing forms
    prisma.form.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: {
        submissions: {
          _count: 'desc'
        }
      },
      take: 5
    }),
    // Get recent activity
    prisma.submission.findMany({
      select: {
        id: true,
        createdAt: true,
        form: {
          select: { title: true }
        },
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  // Calculate metrics
  const activeForms = formAnalytics.filter(f => f.isActive).length
  const averageSubmissionsPerForm = totalForms > 0 ? Math.round((totalSubmissions / totalForms) * 10) / 10 : 0
  const submissionsThisMonth = await prisma.submission.count({
    where: {
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  })

  // Get completion rates (submissions vs form views - simplified)
  const completionRate = totalForms > 0 ? Math.round((totalSubmissions / (totalForms * 10)) * 100) : 0 // Assuming 10 avg views per form

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights and performance metrics for your forms
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              +{submissionsThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeForms}</div>
            <p className="text-xs text-muted-foreground">
              {totalForms - activeForms} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageSubmissionsPerForm}</div>
            <p className="text-xs text-muted-foreground">
              submissions per form
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              estimated conversion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Forms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Top Performing Forms
            </CardTitle>
            <CardDescription>Forms with the most submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {topForms.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p>No forms created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topForms.map((form, index) => (
                  <div key={form.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{form.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {form._count.submissions} submissions
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/forms/${form.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="mx-auto h-8 w-8 mb-2" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{activity.form.title}</div>
                      <div className="text-xs text-muted-foreground">
                        by {activity.user?.name || activity.user?.email || 'Anonymous'}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {recentActivity.length > 8 && (
                  <Button variant="outline" size="sm" className="w-full">
                    View All Activity
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Performance Overview</CardTitle>
          <CardDescription>Detailed breakdown of all forms</CardDescription>
        </CardHeader>
        <CardContent>
          {formAnalytics.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No forms created</h3>
              <p className="text-muted-foreground mb-4">
                Create your first form to see analytics data
              </p>
              <Button asChild>
                <Link href="/forms/new">Create Form</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {formAnalytics.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="space-y-1">
                      <div className="font-medium">{form.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(form.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={form.isActive ? "default" : "secondary"}>
                      {form.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{form._count.submissions}</div>
                      <div className="text-xs text-muted-foreground">Submissions</div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/forms/${form.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="mx-auto h-8 w-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Calendar className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{submissionsThisMonth}</div>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <BarChart3 className="mx-auto h-8 w-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{averageSubmissionsPerForm}</div>
            <p className="text-sm text-muted-foreground">Avg per Form</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}