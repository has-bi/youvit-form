import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center bg-white p-8 rounded-lg border border-gray-200 shadow-sm max-w-md">
        <div className="mb-6">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this dashboard. Only authorized administrators can access this area.
        </p>
        
        <div className="space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <p className="text-sm text-gray-500">
            Need access? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}