import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { NewFormForm } from "@/components/forms/new-form-form"

export default async function NewFormPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Form</h1>
        <p className="text-muted-foreground">
          Build a form to collect responses from your users
        </p>
      </div>

      <NewFormForm />
    </div>
  )
}