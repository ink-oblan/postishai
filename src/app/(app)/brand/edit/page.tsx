import type { BrandProfile } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { BrandSetupWizard } from "../components/BrandSetupWizard";

export const metadata = {
  title: "Edit Brand Profile — PostishAI",
};

function normalizeColorIds(colors: unknown): string {
  if (!colors) return "[]";
  try {
    const parsed = typeof colors === "string" ? JSON.parse(colors as string) : colors;
    if (!Array.isArray(parsed)) return "[]";
    return JSON.stringify(
      parsed.map((color, idx) => ({
        id: color.id || `color-${idx}-${Date.now()}`,
        name: color.name || `Color ${idx + 1}`,
        hex: color.hex || "#000000",
      })),
    );
  } catch {
    return "[]";
  }
}

export default async function BrandEditPage(props: { searchParams: Promise<{ id?: string }> }) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const brandId = searchParams.id;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { brandProfiles: true },
  });

  if (!user) {
    redirect("/login");
  }

  let brandProfile = user.brandProfiles?.[0];

  if (brandId) {
    const specificBrand = user.brandProfiles?.find((b) => b.id === brandId);
    if (specificBrand) {
      brandProfile = specificBrand;
    }
  }

  if (!brandProfile) {
    redirect("/brand");
  }

  // Normalize color IDs before passing to wizard
  const normalizedBrandProfile: BrandProfile = {
    ...brandProfile,
    colors: normalizeColorIds(brandProfile.colors),
  };

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={normalizedBrandProfile} userId={user.id} />
    </div>
  );
}
