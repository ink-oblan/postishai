UPDATE "Post"
SET "status" = 'DRAFT'
WHERE "type" = 'CAROUSEL'
  AND "status" = 'GENERATING'
  AND "carouselStage" = 'EDITING'
  AND NOT EXISTS (
    SELECT 1 FROM "CarouselSlide"
    WHERE "CarouselSlide"."postId" = "Post"."id"
      AND "CarouselSlide"."status" IN ('PENDING', 'GENERATING')
  );

UPDATE "Post"
SET "status" = 'COMPLETED'
WHERE "type" = 'CAROUSEL'
  AND "status" = 'GENERATING'
  AND "carouselStage" = 'COMPLETED';
