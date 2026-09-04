import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { BrandSetupWizard } from "../components/BrandSetupWizard";

export const metadata = {
  title: "Edit Brand Profile — PostishAI",
};

export default async function BrandEditPage(props: { searchParams: Promise<{ id?: string }> }) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const brandId = searchParams.id;

  if (!brandId) {
    redirect("/brand");
  }

  const brandProfile = await prisma.brandProfile.findFirst({
    where: { id: brandId, userId: session.userId },
  });

  if (!brandProfile) {
    redirect("/brand");
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={brandProfile} userId={session.userId} />
    </div>
  );
}
