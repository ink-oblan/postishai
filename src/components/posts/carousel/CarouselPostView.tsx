import { CAROUSEL_STAGE } from "@/lib/constants";
import { ScenarioEditor, type ScenarioSlideRow } from "./ScenarioEditor";
import type { EditorSlide } from "./SlideEditor";
import { SlideEditor } from "./SlideEditor";

interface CarouselPostViewProps {
  postId: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE_SHORTS";
  carouselStage: string | null;
  minSlides: number;
  maxSlides: number;
  scenarioSlides: ScenarioSlideRow[];
  editorSlides: EditorSlide[];
  logoAssetId: string | null;
  uploadedFonts: { assetId: string; name: string }[];
}

export function CarouselPostView({
  postId,
  platform,
  carouselStage,
  minSlides,
  maxSlides,
  scenarioSlides,
  editorSlides,
  logoAssetId,
  uploadedFonts,
}: CarouselPostViewProps) {
  if (carouselStage === CAROUSEL_STAGE.SCENARIO) {
    return (
      <ScenarioEditor
        postId={postId}
        initialSlides={scenarioSlides}
        minSlides={minSlides}
        maxSlides={maxSlides}
      />
    );
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
