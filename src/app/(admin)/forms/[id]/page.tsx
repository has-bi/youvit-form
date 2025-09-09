import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FormSubmissions } from "@/components/forms/form-submissions"
import { Copy, Edit3, ExternalLink, Share } from "lucide-react"
import Link from "next/link"

interface FormPageProps {
  params: {
    id: string
  }
}

export default async function FormPage({ params }: FormPageProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      submissions: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  })

  if (!form) {
    redirect("/forms")
  }

  const formUrl = `${process.env.NEXT_PUBLIC_APP_URL}/f/${form.id}`

  const copyToClipboard = async (text: string) => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
            <div className={`rounded-full px-2 py-1 text-xs font-medium ${
              form.isActive 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-100 text-gray-800"
            }`}>
              {form.isActive ? "Active" : "Inactive"}
            </div>
          </div>
          {form.description && (
            <p className="text-lg text-muted-foreground">{form.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Created by {form.createdBy?.name || form.createdBy?.email} on{" "}
            {new Date(form.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/forms/${form.id}/edit`}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Form
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={formUrl} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{form._count.submissions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Form Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {form.isActive ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">
              {form.isActive ? "Accepting submissions" : "Submissions paused"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Form Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray((form.schema as any)?.fields) ? (form.schema as any).fields.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total form fields
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Share Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Share Form</CardTitle>
          <CardDescription>
            Share this link with users to collect submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <code className="flex-1 p-2 bg-gray-100 rounded border text-sm">
              {formUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(formUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submissions */}
      <FormSubmissions 
        submissions={form.submissions} 
        formSchema={(form.schema as any)?.fields || []} 
      />
    </div>
  )
}