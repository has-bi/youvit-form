"use client"

import { AppleStyleForm } from "@/components/forms/apple-style-form"
import { useRouter } from "next/navigation"

export default function MerchandisingDayVol2Page() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/success")
  }

  return (
    <AppleStyleForm onSuccess={handleSuccess} />
  )
}