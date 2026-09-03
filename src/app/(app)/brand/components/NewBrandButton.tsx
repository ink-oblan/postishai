"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeStorage } from "@/lib/safe-storage";
import { draftKey, readDraft } from "../lib/draft";
import { ResumeDraftButton } from "./ResumeDraftButton";

interface NewBrandButtonProps {
  userId: string;
}

export function NewBrandButton({ userId }: NewBrandButtonProps) {
  const storageKey = draftKey(userId);
  const [hasDraft, setHasDraft] = useState<boolean | null>(null);

  useEffect(() => {
    setHasDraft(readDraft(storageKey) !== null);
  }, [storageKey]);

  const handleDiscard = () => {
    removeStorage(storageKey);
    setHasDraft(false);
  };

  if (hasDraft === null) {
    return <div className="h-8 w-44 shrink-0 rounded-lg bg-muted/50" aria-hidden="true" />;
  }

  if (hasDraft) {
    return (
      <ResumeDraftButton
        href="/brand/new"
        label="Resume Draft"
        discardDescription="The brand details you started filling in will be lost. This can't be undone."
        onDiscard={handleDiscard}
      />
    );
  }

  return (
    <Link href="/brand/new">
      <Button variant="default">Create New Brand</Button>
    </Link>
  );
}
