"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

const errorMessages = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token has expired or is invalid.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from an OAuth provider.",
  OAuthCreateAccount: "Could not create OAuth account.",
  EmailCreateAccount: "Could not create email account.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "The email on the account is already linked, but not with this OAuth account.",
  EmailSignin: "Sending the e-mail with the verification token failed.",
  CredentialsSignin: "The authorize callback returned null in the Credentials provider.",
  SessionRequired: "The content of this page requires you to be signed in at all times.",
  Default: "An error occurred during authentication.",
};

export default function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") as keyof typeof errorMessages;

  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="mt-4">Authentication Error</CardTitle>
            <CardDescription>
              {error === "AccessDenied" 
                ? "Only @youvit.co.id email addresses are allowed to access this application."
                : errorMessage
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              {error === "AccessDenied" && (
                <div className="text-sm text-muted-foreground">
                  <p>Please use your Youvit company email to sign in.</p>
                </div>
              )}
              
              {/* Debug Info */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  <p><strong>Error Code:</strong> {error || "Unknown"}</p>
                  <p><strong>URL:</strong> {window.location.href}</p>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                <Button asChild>
                  <Link href="/login">Try Again</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}