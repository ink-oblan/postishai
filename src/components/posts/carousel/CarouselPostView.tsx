import type { Platform } from "@prisma/client";
import { CAROUSEL_STAGE } from "@/lib/constants";
import { ScenarioEditor, type ScenarioSlideRow } from "./ScenarioEditor";
import type { EditorSlide } from "./SlideEditor";
import { SlideEditor } from "./SlideEditor";

interface CarouselPostViewProps {
  postId: string;
  platform: Platform;
  carouselStage: string | null;
  scenarioSlides: ScenarioSlideRow[];
  editorSlides: EditorSlide[];
  logoAssetId: string | null;
  uploadedFonts: { assetId: string; name: string }[];
}

export function CarouselPostView({
  postId,
  platform,
  carouselStage,
  scenarioSlides,
  editorSlides,
  logoAssetId,
  uploadedFonts,
}: CarouselPostViewProps) {
  if (carouselStage === CAROUSEL_STAGE.SCENARIO) {
    return <ScenarioEditor postId={postId} platform={platform} initialSlides={scenarioSlides} />;
  }

  if (carouselStage === CAROUSEL_STAGE.EDITING) {
    return (
      <SlideEditor
        postId={postId}
        platform={platform}
        initialSlides={editorSlides}
        logoAssetId={logoAssetId}
        uploadedFonts={uploadedFonts}
      />
    );
  }

  return null;
}
