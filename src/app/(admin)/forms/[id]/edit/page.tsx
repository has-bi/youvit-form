import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { FormBuilder } from "@/components/forms/form-builder"

interface EditFormPageProps {
  params: {
    id: string
  }
}

export default async function EditFormPage({ params }: EditFormPageProps) {
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
    },
  })

  if (!form) {
    redirect("/forms")
  }

  // Check if user has permission to edit
  if (form.createdById !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/forms")
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Form</h1>
        <p className="text-muted-foreground">
          Customize your form fields and settings
        </p>
      </div>

      <FormBuilder form={form} />
    </div>
  )
}