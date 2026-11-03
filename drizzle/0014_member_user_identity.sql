ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES portal_users(id);
UPDATE members
SET user_id=(SELECT id FROM portal_users WHERE portal_users.email=members.email)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM portal_users WHERE portal_users.email=members.email);
CREATE UNIQUE INDEX members_user_id_unique ON members(user_id) WHERE user_id IS NOT NULL;
