CREATE TABLE IF NOT EXISTS portal_private.portal_game_statuses (
  tenant_id TEXT NOT NULL DEFAULT 'main',
  provider TEXT NOT NULL,
  game_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','maintenance','close')),
  category_override TEXT NOT NULL DEFAULT '' CHECK (category_override IN ('','slots','fast_game','live','fishing','sports','others')),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, provider, game_id)
);
CREATE INDEX IF NOT EXISTS portal_game_statuses_provider_idx
  ON portal_private.portal_game_statuses(tenant_id, provider, status);
ALTER TABLE portal_private.portal_game_statuses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE portal_private.portal_game_statuses FROM PUBLIC;
DO $portal$
DECLARE role_name TEXT;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON TABLE portal_private.portal_game_statuses FROM %I',role_name);
  END IF;
 END LOOP;
END
$portal$;
