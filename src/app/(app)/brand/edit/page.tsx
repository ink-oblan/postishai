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

  // Scope the lookup to the session user so an id from another account resolves to nothing.
  const brandProfile = brandId
    ? await prisma.brandProfile.findFirst({ where: { id: brandId, userId: session.userId } })
    : await prisma.brandProfile.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: "asc" },
      });

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
      <BrandSetupWizard initialData={normalizedBrandProfile} userId={session.userId} />
    </div>
  );
}
