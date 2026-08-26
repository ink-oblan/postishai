"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { draftKey, readDraft } from "../lib/draft";
import { UnsavedDraftPill } from "./UnsavedDraftPill";

interface NewBrandButtonProps {
  userId: string;
}

export function NewBrandButton({ userId }: NewBrandButtonProps) {
  const storageKey = draftKey(userId);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    setHasDraft(readDraft(storageKey) !== null);
  }, [storageKey]);

  const handleDiscard = () => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {hasDraft && (
        <UnsavedDraftPill
          label="Unsaved draft"
          discardDescription="The brand details you started filling in will be lost. This can't be undone."
          onDiscard={handleDiscard}
        />
      )}

      <Link href="/brand/new">
        <Button variant="default">{hasDraft ? "Resume Draft" : "Create New Brand"}</Button>
      </Link>
    </div>
  );
}
