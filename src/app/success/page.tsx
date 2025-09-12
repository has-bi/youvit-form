import { Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center shadow-sm border border-gray-200 bg-white">
        <CardHeader className="pb-8 pt-8">
          <div className="flex justify-center mb-6">
            <div className="relative overflow-hidden">
              <Image
                src="/images/oliver 3d.png"
                alt="Oliver celebrating"
                width={600}
                height={600}
                className="object-cover object-top"
              />
            </div>
          </div>

          <CardTitle className="text-2xl font-light text-gray-900 mb-3">
            Submission Successful
          </CardTitle>
          <p className="text-gray-500 font-light">
            Thank you for completing your audit
          </p>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pb-8">
          <div className="space-y-4">
            <Button
              asChild
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Link href="/f/merchandising-day-vol-2">
                <FileText className="mr-2 h-4 w-4" />
                Submit Another Response
              </Link>
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-400 font-light">
              Powered by Youvit
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
