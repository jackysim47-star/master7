ALTER TABLE portal_promotion_drafts ADD COLUMN rules_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(rules_json));
