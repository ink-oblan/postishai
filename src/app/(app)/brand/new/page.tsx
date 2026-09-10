import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { MAX_BRAND_PROFILES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { BrandSetupWizard } from "../components/BrandSetupWizard";

export const metadata = {
  title: "Create Brand Profile — PostishAI",
};

export default async function BrandNewPage() {
  const session = await requireSession();

  const brandProfiles = await prisma.brandProfile.findMany({
    where: { userId: session.userId },
    select: { brandName: true },
  });

  if (brandProfiles.length >= MAX_BRAND_PROFILES) {
    redirect("/brand");
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard
        initialData={null}
        userId={session.userId}
        takenNames={brandProfiles.map((brandProfile) => brandProfile.brandName)}
      />
    </div>
  );
}
