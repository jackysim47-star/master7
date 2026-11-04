CREATE TABLE IF NOT EXISTS portal_game_statuses (
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
  ON portal_game_statuses(tenant_id, provider, status);
