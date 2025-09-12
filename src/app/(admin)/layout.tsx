import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navigation } from "@/components/layout/navigation";
import { Toaster } from "sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Only allow hasbi@youvit.co.id to access admin dashboard
  if (session.user.email !== "hasbi@youvit.co.id") {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}