"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

const RULES = [
  "One person in the photo",
  "Good quality, sharp image",
  "Contrast background works best",
  "Half-body or more visible",
  "Works with animated or fictional characters too",
];

export function UploadImageGuide() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-base">Photo recommendations</h2>
      </div>

      <ul className="space-y-2">
        {RULES.map((rule) => (
          <li key={rule} className="flex items-center gap-2.5 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {rule}
          </li>
        ))}
      </ul>

      <div className="mx-auto w-2/3 max-w-[220px] overflow-hidden rounded-xl border bg-muted/30">
        <div className="px-3 pt-3 pb-1.5">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Example
          </p>
        </div>
        <Image
          src="/static/avatar-photo-guide.jpg"
          alt="Good avatar photo example"
          width={480}
          height={640}
          className="w-full object-cover"
          priority
        />
      </div>
    </div>
  );
}
