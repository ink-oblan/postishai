"use client";

import { useState } from "react";
import { NewAvatarForm } from "@/components/avatars/NewAvatarForm";
import { UploadImageGuide } from "@/components/avatars/UploadImageGuide";

type Mode = "generate" | "upload";

export function NewAvatarPageContent() {
  const [mode, setMode] = useState<Mode>("generate");

  return (
    <div className="flex gap-12 pt-8">
      <div className="w-full max-w-lg shrink-0">
        <NewAvatarForm mode={mode} onModeChange={setMode} />
      </div>

      {mode === "upload" && (
        <div className="hidden w-full max-w-sm lg:block">
          <UploadImageGuide />
        </div>
      )}
    </div>
  );
}
