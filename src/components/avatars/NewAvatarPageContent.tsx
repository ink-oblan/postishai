"use client";

import { useState } from "react";
import { NewAvatarForm } from "@/components/avatars/NewAvatarForm";
import { UploadImageGuide } from "@/components/avatars/UploadImageGuide";

type Mode = "generate" | "upload";

export function NewAvatarPageContent() {
  const [mode, setMode] = useState<Mode>("generate");

  return (
    <div className="flex gap-12 pt-8">
      <div className="flex-1">
        <NewAvatarForm mode={mode} onModeChange={setMode} />
      </div>

      {mode === "upload" && (
        <div className="hidden flex-1 lg:flex lg:justify-center">
          <UploadImageGuide />
        </div>
      )}
    </div>
  );
}
