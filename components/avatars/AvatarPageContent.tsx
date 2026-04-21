"use client";

import { ImageIcon, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AvatarActions } from "@/components/avatars/AvatarActions";
import { AvatarEditPanel } from "@/components/avatars/AvatarEditPanel";
import { AvatarStatusPoller } from "@/components/avatars/AvatarStatusPoller";
import { AvatarVariationsPanel } from "@/components/avatars/AvatarVariationsPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS, STATUS_CONFIG } from "@/lib/utils";

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
    updatedAt: string;
    prompt: string | null;
    imageModel: string | null;
    voiceId: string | null;
    gender: string | null;
    age: number | null;
    ethnicity: string | null;
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
        {avatar.status === "GENERATING" || avatar.status === "FAILED" ? (
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
              <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 font-medium text-white text-xs backdrop-blur-sm">
                  {selectedVariation.label}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVariation(null)}
                  className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 font-medium text-white text-xs backdrop-blur-sm transition-colors hover:bg-black/80"
                >
                  <ImageIcon className="h-3 w-3" />
                  Base photo
                </button>
              </div>
            )}
          </div>
        )}
        <AvatarActions
          avatar={{ id: avatar.id, prompt: avatar.prompt, imageModel: avatar.imageModel }}
        />
      </div>

      <div className="space-y-4 md:col-span-2">
        <AvatarEditPanel
          avatar={{
            id: avatar.id,
            name: avatar.name,
            voiceId: avatar.voiceId ?? "",
            gender: avatar.gender,
            age: avatar.age,
            ethnicity: avatar.ethnicity,
            origin: avatar.origin,
            occupation: avatar.occupation,
            imageModel: avatar.imageModel,
            createdAt: avatar.createdAt,
          }}
        />

        <AvatarVariationsPanel
          avatarId={avatar.id}
          initialVariations={initialVariations}
          hasPrompt={true}
          defaultImageModel={avatar.imageModel}
          selectedVariationId={selectedVariation?.id ?? null}
          onVariationClick={handleVariationClick}
          onVariationDelete={handleVariationDelete}
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-medium text-sm">Posts ({posts.length})</CardTitle>
              <Link
                href={`/posts/new?avatarId=${avatar.id}${selectedVariation ? `&variationId=${selectedVariation.id}` : ""}`}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 font-medium text-[0.8rem] text-sm transition-colors hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                {selectedVariation ? "New Post with variation" : "New Post"}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">No posts yet.</p>
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
      </div>
    </div>
  );
}
