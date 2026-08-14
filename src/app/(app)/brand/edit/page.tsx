import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { BrandSetupWizard } from "../components/BrandSetupWizard";

export const metadata = {
  title: "Edit Brand Profile — PostishAI",
};

export default async function BrandEditPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { brandProfiles: true },
  });

  if (!user) {
    redirect("/login");
  }

  const brandProfile = user.brandProfiles?.[0];
  if (!brandProfile) {
    redirect("/brand");
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={brandProfile} userId={user.id} />
    </div>
  );
}
