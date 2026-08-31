"use client";

import { useEffect, useState } from "react";
import { draftKey, readDraft } from "../lib/draft";
import { UnsavedDraftPill } from "./UnsavedDraftPill";

interface BrandDraftBadgeProps {
  userId: string;
  brandId: string;
}

export function BrandDraftBadge({ userId, brandId }: BrandDraftBadgeProps) {
  const storageKey = draftKey(userId, brandId);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    setHasDraft(readDraft(storageKey) !== null);
  }, [storageKey]);

  if (!hasDraft) return null;

  return (
    <UnsavedDraftPill
      label="Unsaved changes"
      resumeHref={`/brand/edit?id=${brandId}`}
      discardDescription="The edits you made to this brand but never saved will be lost. The saved brand itself stays untouched."
      onDiscard={() => {
        localStorage.removeItem(storageKey);
        setHasDraft(false);
      }}
    />
  );
}
