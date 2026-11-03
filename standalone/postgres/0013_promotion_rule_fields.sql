ALTER TABLE portal_private.portal_promotion_drafts ADD COLUMN rules_json JSONB NOT NULL DEFAULT '{}'::jsonb;
