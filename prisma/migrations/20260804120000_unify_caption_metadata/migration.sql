-- Backfill metadata for INSTAGRAM/TIKTOK CAPTION posts that have a plain-text caption
WITH extracted AS (
  SELECT
    id,
    platform::text AS platform_str,
    title,
    TRIM(REGEXP_REPLACE(caption, '\s*#\w+', '', 'g')) AS cleaned_caption,
    COALESCE(
      (SELECT JSONB_AGG(m[1]) FROM REGEXP_MATCHES(caption, '#(\w+)', 'g') AS m),
      '[]'::jsonb
    ) AS tags_json
  FROM "Post"
  WHERE type = 'CAPTION' AND caption IS NOT NULL
)
UPDATE "Post" p
SET metadata = CASE
  WHEN e.platform_str = 'YOUTUBE_SHORTS' THEN JSONB_BUILD_OBJECT(
    'platform', 'YOUTUBE_SHORTS',
    'title', e.title,
    'description', e.cleaned_caption,
    'tags', e.tags_json
  )::text
  ELSE JSONB_BUILD_OBJECT(
    'platform', e.platform_str,
    'caption', e.cleaned_caption,
    'hashtags', e.tags_json
  )::text
END
FROM extracted e
WHERE p.id = e.id;

-- Convert metadata column from TEXT to JSONB (existing JSON strings cast cleanly)
ALTER TABLE "Post" ALTER COLUMN "metadata" TYPE JSONB USING CASE WHEN metadata IS NULL THEN NULL ELSE metadata::jsonb END;

-- Drop the caption column (replaced by metadata.caption for all post types)
ALTER TABLE "Post" DROP COLUMN "caption";

-- Set metadataStatus = COMPLETED for CAPTION posts whose metadata was backfilled above.
-- The old caption job never touched metadataStatus (it only set post.caption + post.status),
-- so these posts all land on IDLE after backfill.
UPDATE "Post"
SET "metadataStatus" = 'COMPLETED'
WHERE type = 'CAPTION'
  AND metadata IS NOT NULL
  AND "metadataStatus" = 'IDLE';

-- Strip inline hashtags from the caption text in metadata JSONB for INSTAGRAM and TIKTOK
-- posts, merging them into the hashtags array. The AI prompts previously instructed the
-- model to embed hashtags directly in the caption string; those are now stored separately
-- in the hashtags array only.
UPDATE "Post"
SET metadata = JSONB_SET(
  JSONB_SET(
    metadata,
    '{caption}',
    TO_JSONB(TRIM(REGEXP_REPLACE(metadata->>'caption', '\s*#\w+', '', 'g')))
  ),
  '{hashtags}',
  COALESCE(
    (
      SELECT JSONB_AGG(tag)
      FROM (
        -- existing hashtags from the array
        SELECT JSONB_ARRAY_ELEMENTS_TEXT(COALESCE(metadata->'hashtags', '[]'::jsonb)) AS tag
        UNION
        -- hashtags extracted from the inline caption text (original value)
        SELECT m[1] FROM REGEXP_MATCHES(metadata->>'caption', '#(\w+)', 'g') AS m
      ) AS all_tags
      WHERE tag IS NOT NULL AND tag != ''
    ),
    '[]'::jsonb
  )
)
WHERE metadata->>'caption' LIKE '%#%'
  AND metadata->>'platform' IN ('INSTAGRAM', 'TIKTOK');
