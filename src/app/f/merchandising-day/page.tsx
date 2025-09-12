"use client"

import { StoreAuditForm } from "@/components/forms/store-audit-form"
import { useRouter } from "next/navigation"

export default function MerchandisingDayPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/success")
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <StoreAuditForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}