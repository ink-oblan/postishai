import { Clapperboard, Mic, Sparkles, SquareStack } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const POST_TYPES = [
  {
    href: "/posts/new/avatar",
    icon: Clapperboard,
    title: "Avatar Video",
    description: "Generate a talking-avatar video.",
    available: true,
  },
  {
    href: "/posts/new/caption",
    icon: Sparkles,
    title: "Generate Caption",
    description: "Write a caption for content you've already created.",
    available: true,
  },
  {
    href: "/posts/new/voiceover",
    icon: Mic,
    title: "Add Voiceover",
    description: "Add an AI voiceover to an uploaded video.",
    available: false,
  },
  {
    href: "/posts/new/carousel",
    icon: SquareStack,
    title: "Carousel",
    description: "Create a carousel post from your images.",
    available: false,
  },
] as const;

export default function NewPostPage() {
  return (
    <div className="max-w-3xl space-y-8 px-6 py-8 sm:px-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">New Post</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">What would you like to create?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {POST_TYPES.map((type) => {
          const Icon = type.icon;
          const cardClassName = cn(
            "h-full transition-all",
            type.available
              ? "cursor-pointer hover:ring-primary/40"
              : "cursor-not-allowed opacity-60",
          );
          const cardContent = (
            <>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  {type.title}
                  {!type.available && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                      Coming soon
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{type.description}</p>
              </CardContent>
            </>
          );

          return type.available ? (
            <Link key={type.href} href={type.href}>
              <Card className={cardClassName}>{cardContent}</Card>
            </Link>
          ) : (
            <div key={type.href}>
              <Card className={cardClassName}>{cardContent}</Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
