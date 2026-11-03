ALTER TABLE portal_private.members ADD COLUMN user_id TEXT REFERENCES portal_private.portal_users(id);
UPDATE portal_private.members m
SET user_id=u.id
FROM portal_private.portal_users u
WHERE m.user_id IS NULL AND u.email=m.email;
CREATE UNIQUE INDEX members_user_id_unique ON portal_private.members(user_id) WHERE user_id IS NOT NULL;
