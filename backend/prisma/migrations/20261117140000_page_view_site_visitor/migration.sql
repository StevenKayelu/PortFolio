-- Which site a view belongs to, plus an anonymous daily visitor code.
ALTER TABLE "page_views" ADD COLUMN "site" TEXT;
ALTER TABLE "page_views" ADD COLUMN "visitorHash" TEXT;
CREATE INDEX "page_views_site_createdAt_idx" ON "page_views"("site", "createdAt");

-- Earlier rows kept the full browser string; reduce it to a device type.
UPDATE "page_views" SET "device" = CASE
  WHEN "device" ~* '(ipad|tablet)' THEN 'tablet'
  WHEN "device" ~* '(mobi|android|iphone)' THEN 'mobile'
  WHEN "device" IS NULL THEN NULL
  ELSE 'desktop' END;
