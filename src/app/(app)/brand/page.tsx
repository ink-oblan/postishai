import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/dal";
import { type BrandAssetRef, type ColorItem, type FontItem, parseList } from "@/lib/brand-fields";
import { MAX_BRAND_PROFILES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { BrandDraftBadge } from "./components/BrandDraftBadge";
import { BrandSetupWizard } from "./components/BrandSetupWizard";
import { DeleteBrandButton } from "./components/DeleteBrandButton";
import { NewBrandButton } from "./components/NewBrandButton";

export const metadata = {
  title: "Brand Profile — PostishAI",
};

const MAX_VISIBLE_COLORS = 6;
const MAX_VISIBLE_FONTS = 4;

export default async function BrandPage() {
  const session = await requireSession();

  const brandProfiles = await prisma.brandProfile.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  // If brand profiles exist, show them all; otherwise show the wizard
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
              <NewBrandButton
                userId={session.userId}
                atLimit={brandProfiles.length >= MAX_BRAND_PROFILES}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {brandProfiles.map((brandProfile) => {
                const colors = parseList<ColorItem>(brandProfile.colors);
                const fonts = parseList<FontItem>(brandProfile.typography);
                const logoAssetId = parseList<BrandAssetRef>(brandProfile.logoPath).find(
                  (logo) => logo.assetId,
                )?.assetId;
                const logoGutter = logoAssetId ? "pr-36" : "";

                return (
                  <div
                    key={brandProfile.id}
                    className="relative flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-6"
                  >
                    {logoAssetId && (
                      <Image
                        src={`/api/brand-profile/file?id=${encodeURIComponent(logoAssetId)}`}
                        alt={`${brandProfile.brandName} logo`}
                        width={128}
                        height={128}
                        unoptimized
                        className="absolute top-6 right-6 h-32 w-32 rounded-md border border-border bg-muted/30 object-contain p-2"
                      />
                    )}

                    <div className={`flex items-start justify-between gap-3 ${logoGutter}`}>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-xl">{brandProfile.brandName}</h2>
                        {brandProfile.topic && (
                          <p className="truncate text-muted-foreground text-sm">
                            {brandProfile.topic}
                          </p>
                        )}
                      </div>
                      <BrandDraftBadge userId={session.userId} brandId={brandProfile.id} />
                    </div>

                    {brandProfile.targetAudience && (
                      <div className={logoGutter}>
                        <h3 className="font-semibold text-muted-foreground text-sm">
                          Target Audience
                        </h3>
                        <p
                          className="mt-1 line-clamp-3 text-sm"
                          title={brandProfile.targetAudience}
                        >
                          {brandProfile.targetAudience}
                        </p>
                      </div>
                    )}

                    {brandProfile.mission && (
                      <div className={logoGutter}>
                        <h3 className="font-semibold text-muted-foreground text-sm">Mission</h3>
                        <p className="mt-1 line-clamp-3 text-sm" title={brandProfile.mission}>
                          {brandProfile.mission}
                        </p>
                      </div>
                    )}

                    {colors.length > 0 && (
                      <div>
                        <h3 className="mb-2 font-semibold text-muted-foreground text-sm">Colors</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {colors.slice(0, MAX_VISIBLE_COLORS).map((color) => (
                            <div
                              key={color.id || color.hex}
                              className="h-8 w-8 rounded border border-border"
                              style={{ backgroundColor: color.hex }}
                              title={color.hex}
                            />
                          ))}
                          {colors.length > MAX_VISIBLE_COLORS && (
                            <span className="text-muted-foreground text-xs">
                              +{colors.length - MAX_VISIBLE_COLORS}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {fonts.length > 0 && (
                      <div>
                        <h3 className="mb-2 font-semibold text-muted-foreground text-sm">
                          Typefaces
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {fonts.slice(0, MAX_VISIBLE_FONTS).map((font) => (
                            <span
                              key={font.id || font.name}
                              className="inline-block max-w-[12rem] truncate rounded bg-muted px-2 py-1 text-xs"
                              title={font.name}
                            >
                              {font.name}
                            </span>
                          ))}
                          {fonts.length > MAX_VISIBLE_FONTS && (
                            <span className="text-muted-foreground text-xs">
                              +{fonts.length - MAX_VISIBLE_FONTS}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex gap-2 pt-4">
                      <Link href={`/brand/edit?id=${brandProfile.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <DeleteBrandButton brandId={brandProfile.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandSetupWizard initialData={null} userId={session.userId} takenNames={[]} />
    </div>
  );
}
