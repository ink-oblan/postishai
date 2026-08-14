import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { BrandSetupWizard } from "../components/BrandSetupWizard";

export const metadata = {
  title: "Create Brand Profile — PostishAI",
};

export default async function BrandNewPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={null} userId={user.id} />
    </div>
  );
}
