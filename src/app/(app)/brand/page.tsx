import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { BrandSetupWizard } from "./components/BrandSetupWizard";
import { DeleteBrandButton } from "./components/DeleteBrandButton";

export const metadata = {
  title: "Brand Profile — PostishAI",
};

interface Color {
  id: string;
  hex: string;
}

interface Font {
  id: string;
  name: string;
}

function normalizeColors(colors: unknown): Color[] {
  if (!colors) return [];
  try {
    const parsed = typeof colors === "string" ? JSON.parse(colors) : colors;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((color, idx) => ({
      id: color.id || `color-${idx}-${Date.now()}`,
      hex: color.hex,
    }));
  } catch {
    return [];
  }
}

function normalizeFonts(fonts: unknown): Font[] {
  if (!fonts) return [];
  try {
    const parsed = typeof fonts === "string" ? JSON.parse(fonts) : fonts;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((font, idx) => ({
      id: font.id || `font-${idx}-${Date.now()}`,
      name: font.name,
    }));
  } catch {
    return [];
  }
}

export default async function BrandPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { brandProfiles: true },
  });

  if (!user) {
    redirect("/login");
  }

  // If brand profiles exist, show them all; otherwise show the wizard
  const brandProfiles = user.brandProfiles || [];
  if (brandProfiles.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="mb-2 font-bold text-3xl">Your Brand Profiles</h1>
                <p className="text-muted-foreground">Manage your brand identities</p>
              </div>
              <Link href="/brand/new">
                <Button variant="default">Create New Brand</Button>
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {brandProfiles.map((brandProfile) => (
                <div
                  key={brandProfile.id}
                  className="space-y-4 rounded-lg border border-border bg-card p-6"
                >
                  <div>
                    <h2 className="font-semibold text-xl">{brandProfile.brandName}</h2>
                    {brandProfile.topic && (
                      <p className="text-muted-foreground text-sm">{brandProfile.topic}</p>
                    )}
                  </div>

                  {brandProfile.targetAudience && (
                    <div>
                      <h3 className="font-semibold text-muted-foreground text-sm">
                        Target Audience
                      </h3>
                      <p className="mt-1 text-sm">{brandProfile.targetAudience}</p>
                    </div>
                  )}

                  {brandProfile.mission && (
                    <div>
                      <h3 className="font-semibold text-muted-foreground text-sm">Mission</h3>
                      <p className="mt-1 text-sm">{brandProfile.mission}</p>
                    </div>
                  )}

                  {brandProfile.colors && (
                    <div>
                      <h3 className="mb-2 font-semibold text-muted-foreground text-sm">Colors</h3>
                      <div className="flex gap-2">
                        {normalizeColors(brandProfile.colors).map((color: Color) => (
                          <div
                            key={color.id}
                            className="h-8 w-8 rounded border border-border"
                            style={{ backgroundColor: color.hex }}
                            title={color.hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {brandProfile.typography && (
                    <div>
                      <h3 className="mb-2 font-semibold text-muted-foreground text-sm">
                        Typefaces
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {normalizeFonts(brandProfile.typography).map((font: Font) => (
                          <span
                            key={font.id}
                            className="inline-block rounded bg-muted px-2 py-1 text-xs"
                          >
                            {font.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Link href={`/brand/edit?id=${brandProfile.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <DeleteBrandButton brandId={brandProfile.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={null} userId={user.id} />
    </div>
  );
}
