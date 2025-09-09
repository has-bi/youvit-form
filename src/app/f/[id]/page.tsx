import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PublicFormRenderer } from "@/components/forms/public-form-renderer"

interface PublicFormPageProps {
  params: {
    id: string
  }
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  // No authentication required - anyone can submit forms
  const resolvedParams = await params

  const form = await prisma.form.findUnique({
    where: { 
      id: resolvedParams.id,
      isActive: true, // Only show active forms
    },
    select: {
      id: true,
      title: true,
      description: true,
      schema: true,
      isActive: true,
    },
  })

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <h1 className="text-xl font-medium text-gray-900 mb-2">
            Form Not Found
          </h1>
          <p className="text-gray-600">
            This form might have been removed or is no longer active.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <PublicFormRenderer form={form} />
      </div>
    </div>
  )
}