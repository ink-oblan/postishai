"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AvatarActions } from "@/components/avatars/AvatarActions";
import { AvatarEditPanel } from "@/components/avatars/AvatarEditPanel";
import { AvatarStatusPoller } from "@/components/avatars/AvatarStatusPoller";
import { AvatarVariationsPanel } from "@/components/avatars/AvatarVariationsPanel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AVATAR_STATUS } from "@/lib/constants";
import { cn, PLATFORM_LABELS, STATUS_CONFIG } from "@/lib/utils";

interface AvatarVariation {
  id: string;
  label: string;
  clothes: string | null;
  background: string | null;
  pose: string | null;
  status: string;
  errorMessage: string | null;
  imagePath: string;
  updatedAt: string;
}

interface PostItem {
  id: string;
  title: string;
  platform: string;
  status: string;
}

interface Props {
  avatar: {
    id: string;
    name: string;
    status: string;
    source: string;
    updatedAt: string;
    prompt: string | null;
    imageModel: string | null;
    voiceId: string | null;
    gender: string | null;
    age: number | null;
    origin: string | null;
    occupation: string | null;
    createdAt: string;
  };
  initialVariations: AvatarVariation[];
  posts: PostItem[];
}

export function AvatarPageContent({ avatar, initialVariations, posts }: Props) {
  const [selectedVariation, setSelectedVariation] = useState<AvatarVariation | null>(null);

  const avatarImageUrl = `/api/avatars/${avatar.id}/image?t=${new Date(avatar.updatedAt).getTime()}`;
  const previewUrl = selectedVariation
    ? `/api/avatars/${avatar.id}/variations/${selectedVariation.id}/image?t=${new Date(selectedVariation.updatedAt).getTime()}`
    : avatarImageUrl;

  function handleVariationClick(variation: AvatarVariation) {
    setSelectedVariation((prev) => (prev?.id === variation.id ? null : variation));
  }

  function handleVariationDelete(variationId: string) {
    if (selectedVariation?.id === variationId) setSelectedVariation(null);
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-4">
        {avatar.status === AVATAR_STATUS.GENERATING || avatar.status === AVATAR_STATUS.FAILED ? (
          <AvatarStatusPoller
            key={avatar.updatedAt}
            avatarId={avatar.id}
            initialStatus={avatar.status}
            generatedAt={avatar.updatedAt}
          />
        ) : (
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
            <Image
              key={previewUrl}
              src={previewUrl}
              alt={selectedVariation ? selectedVariation.label : avatar.name}
              fill
              className="object-cover transition-opacity duration-200"
              unoptimized
            />
            {selectedVariation && (
              <button
                type="button"
                onClick={() => setSelectedVariation(null)}
                className="absolute top-2.5 right-2.5 overflow-hidden rounded-lg border-2 border-background bg-muted opacity-70 shadow-sm transition hover:scale-105 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Show base photo"
                title="Base photo"
              >
                <span className="relative block h-16 w-11 sm:h-20 sm:w-14">
                  <Image
                    src={avatarImageUrl}
                    alt="Base photo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </span>
              </button>
            )}
          </div>
        )}
        <AvatarActions
          avatar={{ id: avatar.id, source: avatar.source, imageModel: avatar.imageModel }}
        />
      </div>

      <div className="space-y-4 md:col-span-2">
        <AvatarEditPanel
          avatar={{
            id: avatar.id,
            name: avatar.name,
            voiceId: avatar.voiceId ?? "",
            source: avatar.source,
            gender: avatar.gender,
            age: avatar.age,
            origin: avatar.origin,
            occupation: avatar.occupation,
            imageModel: avatar.imageModel,
            createdAt: avatar.createdAt,
          }}
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-medium text-sm">Posts ({posts.length})</CardTitle>
              {posts.length > 0 && (
                <Link
                  href={`/posts/new/avatar?avatarId=${avatar.id}${selectedVariation ? `&variationId=${selectedVariation.id}` : ""}`}
                  className={buttonVariants({ size: "sm", className: "h-7 px-2.5" })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {selectedVariation ? "New post with variation" : "New post"}
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="flex min-h-28 flex-col items-center justify-center gap-3 py-4 text-center">
                <Link
                  href={`/posts/new/avatar?avatarId=${avatar.id}${selectedVariation ? `&variationId=${selectedVariation.id}` : ""}`}
                  className={cn(buttonVariants(), "gap-1.5")}
                >
                  <Plus className="h-4 w-4" />
                  {selectedVariation ? "New post with variation" : "New post"}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {posts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="-mx-2 flex items-center justify-between rounded px-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <p className="truncate text-sm">{post.title}</p>
                      <div className="ml-3 flex shrink-0 gap-2">
                        <Badge variant="outline" className="text-xs">
                          {PLATFORM_LABELS[post.platform]}
                        </Badge>
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium text-xs ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AvatarVariationsPanel
          avatarId={avatar.id}
          initialVariations={initialVariations}
          defaultImageModel={avatar.imageModel}
          selectedVariationId={selectedVariation?.id ?? null}
          onVariationClick={handleVariationClick}
          onVariationDelete={handleVariationDelete}
        />
      </div>
    </div>
  );
}
