import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ErrorPayload = {
  error?: unknown
  message?: unknown
  errors?: unknown
  detail?: unknown
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const coerceToString = (value: unknown): string | null => {
  if (isNonEmptyString(value)) {
    return value.trim()
  }

  if (Array.isArray(value)) {
    const joined = value
      .filter((item): item is string => isNonEmptyString(item))
      .join(", ")

    return joined.length > 0 ? joined : null
  }

  return null
}

/**
 * Extracts a human-readable message from a failed fetch response.
 * Ensures the response body is consumed only once per request.
 */
export async function getReadableErrorMessage(
  response: Response,
  fallback = "Something went wrong. Please try again."
): Promise<string> {
  try {
    const data = (await response.clone().json()) as ErrorPayload | string | undefined

    if (typeof data === "string") {
      return data.trim() || fallback
    }

    if (data && typeof data === "object") {
      const messageFromError = coerceToString(data.error)
      if (messageFromError) return messageFromError

      const messageFromMessage = coerceToString(data.message)
      if (messageFromMessage) return messageFromMessage

      const messageFromErrors = coerceToString(data.errors)
      if (messageFromErrors) return messageFromErrors

      const messageFromDetail = coerceToString((data as ErrorPayload).detail)
      if (messageFromDetail) return messageFromDetail
    }
  } catch {
    // Ignore JSON parsing errors and fall back to default message
  }

  return fallback
}
