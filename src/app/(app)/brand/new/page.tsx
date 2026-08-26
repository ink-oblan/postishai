import { requireSession } from "@/lib/auth/dal";
import { BrandSetupWizard } from "../components/BrandSetupWizard";

export const metadata = {
  title: "Create Brand Profile — PostishAI",
};

export default async function BrandNewPage() {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={null} userId={session.userId} />
    </div>
  );
}
