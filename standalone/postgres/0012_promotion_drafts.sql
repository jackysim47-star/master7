CREATE TABLE portal_private.portal_promotion_drafts (
 id TEXT PRIMARY KEY,
 tenant_id TEXT NOT NULL,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 kind TEXT NOT NULL CHECK(kind IN ('cashback','red_packet','bonus','vip','revenue_share')),
 summary TEXT NOT NULL CHECK(length(summary) BETWEEN 1 AND 300),
 terms TEXT NOT NULL CHECK(length(terms) BETWEEN 1 AND 5000),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_review','approved_draft','rejected')),
 created_by TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 reviewer TEXT,
 review_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 reviewed_at TEXT
);
CREATE INDEX portal_promotion_drafts_tenant_idx ON portal_private.portal_promotion_drafts(tenant_id,created_at DESC);
ALTER TABLE portal_private.portal_promotion_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON portal_private.portal_promotion_drafts FROM PUBLIC;
DO $promotion_drafts$
DECLARE role_name TEXT;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON portal_private.portal_promotion_drafts FROM %I',role_name);
  END IF;
 END LOOP;
END
$promotion_drafts$;
