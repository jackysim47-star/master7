import {createHash,randomBytes,randomUUID} from 'node:crypto';

export const PORTAL_STATUS_MIGRATION = "0012-close-defaults-and-brand-directory";
export const CONNECTED_SERVICES_MIGRATION = "0013-open-connected-catalog-and-vpay";
export const PAYMENT_PROVIDERS_MIGRATION = "0017-payment-providers";
export const ONE_MPAY_CHANNEL_MIGRATION = "0018-open-configured-1mpay";
export const MANUAL_BANK_MIGRATION = "0020-manual-bank-deposits";
export const API_SUPPLIER_STATUS_MIGRATION = "0021-api-supplier-status";
export const GAME_ACCESS_ZONE_MIGRATION = "0025-game-access-zones";
export const PAYMENT_ACCEPTANCE_GUARD_MIGRATION = "0026-payment-acceptance-guard";
export const MARKETING_CONTACT_SCALE_MIGRATION = "0027-marketing-contact-scale";
export const OPERATIONS_AUTOMATION_MIGRATION = "0091-operations-automation";
export const SUPPORT_MARKETING_MIGRATION = "0092-support-marketing-notifications";
export const WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION = "0100-whatsapp-campaign-delivery";
export const REWARDS_HUB_MIGRATION = "0101-rewards-hub";
export const RESPONSIBLE_PLAY_MIGRATION = "0102-responsible-play";
export const COMPANY_BANK_ARTWORK_MIGRATION = "0103-company-bank-artwork";
export const NEW_MEMBER_VOUCHER_MIGRATION = "0104-new-member-rm88-voucher";
export const VOUCHER_MANUAL_WORKFLOW_MIGRATION = "0105-voucher-manual-workflow";
export const FIXED_VOUCHER_RETIREMENT_MIGRATION = "0106-retire-fixed-rm88-voucher";
export const BENEFIT_CLAIM_REVIEW_MIGRATION = "0107-benefit-claim-reviews";
export const MANUAL_COMPLIANCE_MIGRATION = "0108-manual-compliance-review";
export const GSPAY_USDT_PROFILE_MIGRATION = "0109-gspay-usdt-profile";
export const GAME_PROVIDER_ADAPTER_CORE_MIGRATION = "0110-game-provider-adapter-core";
export const MEGAH5_LAUNCH_OPERATIONS_MIGRATION = "0112-megah5-launch-operations";
export const GAME_PROVIDER_ACCEPTANCE_MIGRATION = "0113-game-provider-acceptance-evidence";
export const GENERIC_GAME_WALLET_RISK_MIGRATION = "0114-generic-game-wallet-risk-indexes";
export const PAYOUT_CONTROL_MIGRATION = "0098-provider-payout-control";
export const GSPAY_PAYOUT_ACTIVATION_MIGRATION = "0099-open-explicit-gspay-payout";
export const PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS = Object.freeze({
  vpay: "0095-open-explicit-vpay-deposit",
  "1mpay": "0096-open-explicit-1mpay-deposit",
  gspay: "0097-open-explicit-gspay-deposit",
});
export const PORTAL_MIGRATION_ADVISORY_LOCK = 771700100;

// The additive table and its identity index are created by the current Render
// schema inside the same startup transaction before this marker is written.
async function applyMegaH5LaunchOperationsMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [MEGAH5_LAUNCH_OPERATIONS_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [MEGAH5_LAUNCH_OPERATIONS_MIGRATION]);
  return true;
}

async function applyGameProviderAcceptanceMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [GAME_PROVIDER_ACCEPTANCE_MIGRATION]);
  if (applied.rows.length) return false;
  const statements = [
    `CREATE TABLE IF NOT EXISTS game_provider_acceptance_events (
      id TEXT PRIMARY KEY NOT NULL,profile_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK (revision > 0),
      capability TEXT NOT NULL CHECK (capability IN ('catalogue','launch','wallet','settlement','recovery')),
      environment TEXT NOT NULL CHECK (environment IN ('uat','production')),
      result TEXT NOT NULL CHECK (result IN ('passed','failed','revoked')),
      evidence_sha256 TEXT NOT NULL CHECK (length(evidence_sha256) = 64),
      evidence_reference TEXT NOT NULL CHECK (length(evidence_reference) BETWEEN 1 AND 200),
      verified_by TEXT NOT NULL REFERENCES users(id),observed_at BIGINT NOT NULL CHECK (observed_at >= 0),
      recorded_at BIGINT NOT NULL CHECK (recorded_at >= 0),UNIQUE(id,profile_id,capability,environment),
      UNIQUE(profile_id,capability,environment,revision))`,
    "CREATE INDEX IF NOT EXISTS game_provider_acceptance_events_profile ON game_provider_acceptance_events(profile_id,environment,capability,recorded_at DESC,id DESC)",
    `CREATE TABLE IF NOT EXISTS game_provider_acceptance_current (
      profile_id TEXT NOT NULL,
      capability TEXT NOT NULL CHECK (capability IN ('catalogue','launch','wallet','settlement','recovery')),
      environment TEXT NOT NULL CHECK (environment IN ('uat','production')),event_id TEXT NOT NULL UNIQUE,
      PRIMARY KEY(profile_id,capability,environment),
      FOREIGN KEY(event_id,profile_id,capability,environment)
        REFERENCES game_provider_acceptance_events(id,profile_id,capability,environment))`,
    "CREATE INDEX IF NOT EXISTS game_provider_acceptance_current_environment ON game_provider_acceptance_current(environment,profile_id,capability)",
  ];
  for (const statement of statements) await client.query(statement);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [GAME_PROVIDER_ACCEPTANCE_MIGRATION]);
  return true;
}

async function applyGenericGameWalletRiskMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [GENERIC_GAME_WALLET_RISK_MIGRATION]);
  if (applied.rows.length) return false;
  for (const statement of [
    "CREATE INDEX IF NOT EXISTS game_provider_sessions_user_status ON game_provider_sessions(user_id,status,id)",
    "CREATE INDEX IF NOT EXISTS game_wallet_transfers_user_status ON game_wallet_transfers(user_id,status,session_id)",
    "CREATE INDEX IF NOT EXISTS game_transactions_user_status ON game_transactions(user_id,status,id)",
  ]) await client.query(statement);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [GENERIC_GAME_WALLET_RISK_MIGRATION]);
  return true;
}

function seedRows(entries) {
  const positions = new Map();
  return entries.map((entry) => {
    const categorySlug = entry.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const brandSlug = entry.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const position = positions.get(entry.category) ?? 0;
    positions.set(entry.category, position + 1);
    return {
      id: `${categorySlug}:${brandSlug}`,
      category: entry.category,
      display_name: entry.displayName,
      position,
      marked: Boolean(entry.marked),
    };
  });
}

async function snapshotRows(client, entityType, selectSql) {
  await client.query(
    `INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
     SELECT $1,$2,entity_key,row_data,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
     FROM (${selectSql}) AS snapshot_source
     ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`,
    [PORTAL_STATUS_MIGRATION, entityType],
  );
}

async function applyStatusMigration(client) {
  const applied = await client.query(
    "SELECT version FROM portal_schema_migrations WHERE version=$1",
    [PORTAL_STATUS_MIGRATION],
  );
  if (applied.rows.length) return false;

  await snapshotRows(client, "game_visibility", `SELECT provider_id || ':' || game_code AS entity_key, to_jsonb(g) AS row_data FROM game_visibility g`);
  await snapshotRows(client, "custom_game_cards", `SELECT id AS entity_key, to_jsonb(g) AS row_data FROM custom_game_cards g`);
  await snapshotRows(client, "payment_channel_controls", `SELECT provider_id AS entity_key, to_jsonb(g) AS row_data FROM payment_channel_controls g`);
  await snapshotRows(client, "providers", `SELECT id AS entity_key, to_jsonb(g) AS row_data FROM providers g`);

  await client.query("UPDATE game_visibility SET status='closed', visible=0");
  await client.query("UPDATE custom_game_cards SET status='closed', enabled=0");
  await client.query("UPDATE payment_channel_controls SET status='closed'");
  await client.query(
    `INSERT INTO providers(id,name,category,symbol,visible)
     VALUES ('jili','JILI','supplier','JILI',1),('megah5','MegaH5','supplier','MEGA H5',1),('918kissh5','918KISS','supplier','918KISS',1)
     ON CONFLICT(id) DO UPDATE SET visible=1`,
  );
  await client.query(
    "INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",
    [PORTAL_STATUS_MIGRATION],
  );
  return true;
}

async function applyConnectedServicesMigration(client) {
  const applied = await client.query(
    "SELECT version FROM portal_schema_migrations WHERE version=$1",
    [CONNECTED_SERVICES_MIGRATION],
  );
  if (applied.rows.length) return false;

  await client.query(
    `INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
     SELECT $1,'payment_channel_controls',provider_id,to_jsonb(p),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
     FROM payment_channel_controls p WHERE provider_id='vpay'
     ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`,
    [CONNECTED_SERVICES_MIGRATION],
  );
  await client.query(
    `INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
     SELECT $1,'game_visibility',provider_id || ':' || game_code,to_jsonb(g),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
     FROM game_visibility g WHERE provider_id IN ('megah5','jili','918kissh5')
     ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`,
    [CONNECTED_SERVICES_MIGRATION],
  );
  await client.query("UPDATE game_visibility SET status='active',visible=1,updated_by='system',updated_at=CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT) WHERE provider_id IN ('megah5','jili','918kissh5')");
  await client.query(
    "INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",
    [CONNECTED_SERVICES_MIGRATION],
  );
  return true;
}

async function applyPaymentProvidersMigration(client, options) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [PAYMENT_PROVIDERS_MIGRATION]);
  if (!applied.rows.length) {
    // PostgreSQL changes only the allowed provider constraint. No table rebuild,
    // balance update or deletion is needed on the deployed application.
    await client.query("ALTER TABLE deposit_orders DROP CONSTRAINT IF EXISTS deposit_orders_provider_check");
    await client.query("ALTER TABLE deposit_orders ADD CONSTRAINT deposit_orders_provider_check CHECK (provider IN ('vpay','1mpay','gspay'))");
    await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [PAYMENT_PROVIDERS_MIGRATION]);
  }
  if (!options.oneMpayEnabled) return;
  const opened = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [ONE_MPAY_CHANNEL_MIGRATION]);
  if (opened.rows.length) return;
  await client.query(`INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
    SELECT $1,'payment_channel_controls',provider_id,to_jsonb(p),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
    FROM payment_channel_controls p WHERE provider_id='1mpay'
    ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`, [ONE_MPAY_CHANNEL_MIGRATION]);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [ONE_MPAY_CHANNEL_MIGRATION]);
}

async function applyPaymentAcceptanceGuard(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [PAYMENT_ACCEPTANCE_GUARD_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query(`INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
    SELECT $1,'payment_channel_controls',provider_id,to_jsonb(p),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
    FROM payment_channel_controls p WHERE provider_id IN ('vpay','gspay','1mpay','gspay_plus')
    ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`, [PAYMENT_ACCEPTANCE_GUARD_MIGRATION]);
  await client.query(`UPDATE payment_channel_controls
    SET status=CASE WHEN provider_id IN ('vpay','1mpay') THEN 'suspended' ELSE 'closed' END,
        updated_by='system',updated_at=CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
    WHERE provider_id IN ('vpay','gspay','1mpay','gspay_plus')`);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [PAYMENT_ACCEPTANCE_GUARD_MIGRATION]);
  return true;
}

async function applyManualBankMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [MANUAL_BANK_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE deposit_orders DROP CONSTRAINT IF EXISTS deposit_orders_provider_check");
  await client.query("ALTER TABLE deposit_orders ADD CONSTRAINT deposit_orders_provider_check CHECK (provider IN ('vpay','1mpay','gspay','manual_bank'))");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [MANUAL_BANK_MIGRATION]);
  return true;
}

async function applyApiSupplierStatusMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [API_SUPPLIER_STATUS_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE api_supplier_artwork ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
  await client.query("ALTER TABLE api_supplier_artwork DROP CONSTRAINT IF EXISTS api_supplier_artwork_status_check");
  await client.query("ALTER TABLE api_supplier_artwork ADD CONSTRAINT api_supplier_artwork_status_check CHECK (status IN ('active','suspended','closed'))");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [API_SUPPLIER_STATUS_MIGRATION]);
  return true;
}

async function applyGameAccessZoneMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [GAME_ACCESS_ZONE_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE game_visibility ADD COLUMN IF NOT EXISTS access_zone TEXT NOT NULL DEFAULT 'paid'");
  await client.query("ALTER TABLE game_visibility DROP CONSTRAINT IF EXISTS game_visibility_access_zone_check");
  await client.query("ALTER TABLE game_visibility ADD CONSTRAINT game_visibility_access_zone_check CHECK (access_zone IN ('free','paid'))");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [GAME_ACCESS_ZONE_MIGRATION]);
  return true;
}

async function applyMarketingContactScaleMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [MARKETING_CONTACT_SCALE_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("CREATE INDEX IF NOT EXISTS marketing_contacts_export ON marketing_contacts(consent_status,created_at,id)");
  await client.query("INSERT INTO settings(id,value) SELECT 'marketing_contact_count',CAST(COUNT(*) AS TEXT) FROM marketing_contacts ON CONFLICT(id) DO NOTHING");
  await client.query("INSERT INTO settings(id,value) VALUES('marketing_import_lock','0') ON CONFLICT(id) DO NOTHING");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [MARKETING_CONTACT_SCALE_MIGRATION]);
  return true;
}

async function applyOperationsAutomationMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [OPERATIONS_AUTOMATION_MIGRATION]);
  if (applied.rows.length) return false;
  // Preserve the meaning of content that was already visible before scheduling
  // and draft states were added. New records default to draft.
  await client.query("UPDATE lobby_ads SET status=CASE WHEN enabled=1 THEN 'published' ELSE 'draft' END");
  await client.query("UPDATE announcements SET status='published',updated_at=created_at WHERE updated_at IS NULL");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [OPERATIONS_AUTOMATION_MIGRATION]);
  return true;
}

async function applySupportMarketingMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [SUPPORT_MARKETING_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS consented_at BIGINT");
  await client.query("ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS consent_source TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS consent_proof TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT");
  await client.query("UPDATE marketing_contacts SET unsubscribe_token=md5(random()::text || clock_timestamp()::text || id) WHERE unsubscribe_token IS NULL");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS marketing_contacts_unsubscribe ON marketing_contacts(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL");
  await client.query(`CREATE TABLE IF NOT EXISTS ticket_reads (
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_event_at BIGINT NOT NULL,
    last_event_id TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY(ticket_id,user_id))`);
  await client.query("CREATE INDEX IF NOT EXISTS ticket_reads_user ON ticket_reads(user_id,updated_at DESC)");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [SUPPORT_MARKETING_MIGRATION]);
  return true;
}

async function applyWhatsAppCampaignDeliveryMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'unconfigured'");
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS template_name TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS template_language TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS template_params_json TEXT NOT NULL DEFAULT '{}'");
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS audience_count INTEGER NOT NULL DEFAULT 0");
  await client.query("ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_audience_count_check");
  await client.query("ALTER TABLE marketing_campaigns ADD CONSTRAINT marketing_campaigns_audience_count_check CHECK (audience_count >= 0)");
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS started_at BIGINT");
  await client.query("ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS completed_at BIGINT");
  await client.query("ALTER TABLE marketing_deliveries DROP CONSTRAINT IF EXISTS marketing_deliveries_status_check");
  await client.query("ALTER TABLE marketing_deliveries ADD CONSTRAINT marketing_deliveries_status_check CHECK (status IN ('queued','submitting','unknown','sent','delivered','read','failed','opted_out'))");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS claim_token TEXT");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS locked_until BIGINT NOT NULL DEFAULT 0");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS next_attempt_at BIGINT NOT NULL DEFAULT 0");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS provider_error_code TEXT");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS submitted_at BIGINT");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS sent_at BIGINT");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS delivered_at BIGINT");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS read_at BIGINT");
  await client.query("ALTER TABLE marketing_deliveries ADD COLUMN IF NOT EXISTS failed_at BIGINT");
  await client.query("CREATE INDEX IF NOT EXISTS marketing_deliveries_due ON marketing_deliveries(status,next_attempt_at,locked_until,updated_at)");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS marketing_deliveries_provider_message ON marketing_deliveries(provider_message_id) WHERE provider_message_id IS NOT NULL");
  await client.query(`CREATE TABLE IF NOT EXISTS marketing_webhook_events (
    event_key TEXT PRIMARY KEY NOT NULL,
    provider_message_id TEXT,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    payload_hash TEXT NOT NULL,
    received_at BIGINT NOT NULL)`);
  await client.query("CREATE INDEX IF NOT EXISTS marketing_webhook_events_message ON marketing_webhook_events(provider_message_id,received_at)");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION]);
  return true;
}

async function applyRewardsHubMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [REWARDS_HUB_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query(`CREATE TABLE IF NOT EXISTS rewards_checkins (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    myt_day BIGINT NOT NULL,
    cycle_day INTEGER NOT NULL CHECK (cycle_day BETWEEN 1 AND 7),
    streak INTEGER NOT NULL CHECK (streak > 0),
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    created_at BIGINT NOT NULL,
    UNIQUE(user_id,myt_day))`);
  await client.query("CREATE INDEX IF NOT EXISTS rewards_checkins_user_day ON rewards_checkins(user_id,myt_day DESC)");
  await client.query(`CREATE TABLE IF NOT EXISTS rewards_points_ledger (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('checkin','mission','milestone')),
    source_id TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    status TEXT NOT NULL DEFAULT 'earned' CHECK (status='earned'),
    cash_value_status TEXT NOT NULL DEFAULT 'none' CHECK (cash_value_status='none'),
    wallet_credit_status TEXT NOT NULL DEFAULT 'disabled' CHECK (wallet_credit_status='disabled'),
    redemption_status TEXT NOT NULL DEFAULT 'disabled' CHECK (redemption_status='disabled'),
    created_at BIGINT NOT NULL,
    UNIQUE(source_type,source_id))`);
  await client.query("CREATE INDEX IF NOT EXISTS rewards_points_user_created ON rewards_points_ledger(user_id,created_at DESC,id DESC)");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [REWARDS_HUB_MIGRATION]);
  return true;
}

async function applyResponsiblePlayMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [RESPONSIBLE_PLAY_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query(`CREATE TABLE IF NOT EXISTS responsible_play_locks (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    touched_at BIGINT NOT NULL)`);
  await client.query(`CREATE TABLE IF NOT EXISTS responsible_play_profiles (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_limit_minor BIGINT CHECK (daily_limit_minor IS NULL OR daily_limit_minor > 0),
    weekly_limit_minor BIGINT CHECK (weekly_limit_minor IS NULL OR weekly_limit_minor > 0),
    monthly_limit_minor BIGINT CHECK (monthly_limit_minor IS NULL OR monthly_limit_minor > 0),
    pending_daily_limit_minor BIGINT CHECK (pending_daily_limit_minor IS NULL OR pending_daily_limit_minor > 0),
    pending_weekly_limit_minor BIGINT CHECK (pending_weekly_limit_minor IS NULL OR pending_weekly_limit_minor > 0),
    pending_monthly_limit_minor BIGINT CHECK (pending_monthly_limit_minor IS NULL OR pending_monthly_limit_minor > 0),
    pending_limits_effective_at BIGINT,
    cooling_off_until BIGINT,
    self_excluded_until BIGINT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    last_change_id TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL)`);
  await client.query("CREATE INDEX IF NOT EXISTS responsible_play_active_windows ON responsible_play_profiles(cooling_off_until,self_excluded_until)");
  await client.query(`CREATE TABLE IF NOT EXISTS responsible_play_deposit_reservations (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_key TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('vpay','gspay','1mpay','manual_bank')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed','released')),
    order_id TEXT REFERENCES deposit_orders(id),
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY(user_id,request_key))`);
  await client.query("CREATE INDEX IF NOT EXISTS responsible_play_reservations_active ON responsible_play_deposit_reservations(user_id,status,expires_at)");
  await client.query(`CREATE OR REPLACE FUNCTION responsible_play_reject_active_window_shortening()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE current_epoch BIGINT := CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT);
    BEGIN
      IF OLD.cooling_off_until IS NOT NULL AND OLD.cooling_off_until > current_epoch
         AND (NEW.cooling_off_until IS NULL OR NEW.cooling_off_until < OLD.cooling_off_until) THEN
        RAISE EXCEPTION 'RESPONSIBLE_PLAY_ACTIVE_WINDOW_IMMUTABLE';
      END IF;
      IF OLD.self_excluded_until IS NOT NULL AND OLD.self_excluded_until > current_epoch
         AND (NEW.self_excluded_until IS NULL OR NEW.self_excluded_until < OLD.self_excluded_until) THEN
        RAISE EXCEPTION 'RESPONSIBLE_PLAY_ACTIVE_WINDOW_IMMUTABLE';
      END IF;
      RETURN NEW;
    END $$`);
  await client.query("DROP TRIGGER IF EXISTS responsible_play_no_active_window_shortening ON responsible_play_profiles");
  await client.query(`CREATE TRIGGER responsible_play_no_active_window_shortening
    BEFORE UPDATE OF cooling_off_until,self_excluded_until ON responsible_play_profiles
    FOR EACH ROW EXECUTE FUNCTION responsible_play_reject_active_window_shortening()`);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [RESPONSIBLE_PLAY_MIGRATION]);
  return true;
}

async function applyCompanyBankArtworkMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [COMPANY_BANK_ARTWORK_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE company_bank_accounts ADD COLUMN IF NOT EXISTS image_data TEXT NOT NULL DEFAULT ''");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [COMPANY_BANK_ARTWORK_MIGRATION]);
  return true;
}

async function applyManualComplianceMigration(client) {
  const applied=await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1",[MANUAL_COMPLIANCE_MIGRATION]);
  if(applied.rows.length)return false;
  await client.query(`CREATE TABLE IF NOT EXISTS manual_compliance_reviews (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
    identity_status TEXT NOT NULL DEFAULT 'pending' CHECK (identity_status IN ('pending','passed','failed')),
    aml_status TEXT NOT NULL DEFAULT 'pending' CHECK (aml_status IN ('pending','passed','failed')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),last_change_id TEXT NOT NULL,last_authorization_id TEXT,
    created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL)`);
  await client.query(`CREATE TABLE IF NOT EXISTS manual_compliance_events (
    id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
    reviewer_id TEXT NOT NULL REFERENCES users(id),review_type TEXT NOT NULL CHECK (review_type IN ('identity','aml')),
    decision TEXT NOT NULL CHECK (decision IN ('passed','failed')),created_at BIGINT NOT NULL)`);
  await client.query('CREATE INDEX IF NOT EXISTS manual_compliance_events_member ON manual_compliance_events(user_id,created_at,id)');
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[MANUAL_COMPLIANCE_MIGRATION]);
  return true;
}

async function applyGSPayUsdtProfileMigration(client) {
  const applied=await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1",[GSPAY_USDT_PROFILE_MIGRATION]);
  if(applied.rows.length)return false;
  await client.query(`INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
    SELECT $1,'payment_channel_controls',provider_id,to_jsonb(p),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
    FROM payment_channel_controls p WHERE provider_id='gspay_usdt'
    ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`,[GSPAY_USDT_PROFILE_MIGRATION]);
  await client.query(`INSERT INTO payment_channel_controls(provider_id,provider_name,status,updated_by,updated_at)
    VALUES ('gspay_usdt','GSPAY+ USDT','closed','system:contract-pending',CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))
    ON CONFLICT(provider_id) DO UPDATE SET provider_name='GSPAY+ USDT',status='closed',updated_by='system:contract-pending',updated_at=excluded.updated_at`);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[GSPAY_USDT_PROFILE_MIGRATION]);
  return true;
}

async function applyGameProviderAdapterCoreMigration(client) {
  const applied=await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1",[GAME_PROVIDER_ADAPTER_CORE_MIGRATION]);
  if(applied.rows.length)return false;
  const statements=[
    `CREATE TABLE IF NOT EXISTS game_provider_profiles (
      id TEXT PRIMARY KEY NOT NULL,provider_id TEXT NOT NULL,display_name TEXT NOT NULL,adapter_key TEXT NOT NULL,
      wallet_mode TEXT NOT NULL CHECK (wallet_mode IN ('transfer','seamless')),
      balance_class TEXT NOT NULL CHECK (balance_class IN ('cash','free_credit')),
      currency TEXT NOT NULL CHECK (length(currency) BETWEEN 3 AND 8),
      unit_numerator BIGINT NOT NULL DEFAULT 1 CHECK (unit_numerator > 0),
      unit_denominator BIGINT NOT NULL DEFAULT 1 CHECK (unit_denominator > 0),
      environment TEXT NOT NULL CHECK (environment IN ('uat','production')),
      status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('closed','uat','active','maintenance')),
      created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL)`,
    "CREATE INDEX IF NOT EXISTS game_provider_profiles_provider ON game_provider_profiles(provider_id,status,id)",
    `CREATE TABLE IF NOT EXISTS game_provider_players (
      profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),user_id TEXT NOT NULL REFERENCES users(id),
      provider_player_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','blocked','review')),
      created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,verified_at BIGINT,
      PRIMARY KEY(profile_id,user_id),UNIQUE(profile_id,provider_player_id))`,
    "CREATE INDEX IF NOT EXISTS game_provider_players_user ON game_provider_players(user_id,profile_id)",
    `CREATE TABLE IF NOT EXISTS game_provider_sessions (
      id TEXT PRIMARY KEY NOT NULL,profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),user_id TEXT NOT NULL REFERENCES users(id),
      provider_player_id TEXT NOT NULL,game_code TEXT NOT NULL,provider_game_id TEXT NOT NULL,provider_session_id TEXT,
      request_key TEXT NOT NULL,request_fingerprint TEXT NOT NULL,wallet_mode TEXT NOT NULL CHECK (wallet_mode IN ('transfer','seamless')),
      currency TEXT NOT NULL CHECK (length(currency) BETWEEN 3 AND 8),
      status TEXT NOT NULL CHECK (status IN ('prepared','launching','active','settling','settled','failed','unknown','review')),
      last_error_code TEXT NOT NULL DEFAULT '',created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,closed_at BIGINT,
      FOREIGN KEY(profile_id,user_id) REFERENCES game_provider_players(profile_id,user_id),
      UNIQUE(profile_id,request_key),UNIQUE(id,profile_id,user_id))`,
    "CREATE UNIQUE INDEX IF NOT EXISTS game_provider_sessions_provider_session ON game_provider_sessions(profile_id,provider_session_id) WHERE provider_session_id IS NOT NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS game_provider_sessions_one_open ON game_provider_sessions(user_id,profile_id) WHERE status IN ('prepared','launching','active','settling','unknown','review')",
    "CREATE INDEX IF NOT EXISTS game_provider_sessions_updated ON game_provider_sessions(profile_id,status,updated_at,id)",
    `CREATE TABLE IF NOT EXISTS game_wallet_transfers (
      id TEXT PRIMARY KEY NOT NULL,session_id TEXT NOT NULL,profile_id TEXT NOT NULL,user_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('deposit','withdrawal')),request_key TEXT NOT NULL,request_fingerprint TEXT NOT NULL,
      provider_reference TEXT NOT NULL,amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
      currency TEXT NOT NULL CHECK (length(currency) BETWEEN 3 AND 8),
      status TEXT NOT NULL CHECK (status IN ('prepared','submitting','unknown','succeeded','failed','review','reversed')),
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),last_error_code TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,completed_at BIGINT,
      FOREIGN KEY(session_id,profile_id,user_id) REFERENCES game_provider_sessions(id,profile_id,user_id),
      UNIQUE(profile_id,request_key),UNIQUE(profile_id,provider_reference))`,
    "CREATE INDEX IF NOT EXISTS game_wallet_transfers_recovery ON game_wallet_transfers(profile_id,status,updated_at,id)",
    "CREATE INDEX IF NOT EXISTS game_wallet_transfers_session ON game_wallet_transfers(session_id,created_at,id)",
    `CREATE TABLE IF NOT EXISTS game_rounds (
      id TEXT PRIMARY KEY NOT NULL,profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),user_id TEXT NOT NULL REFERENCES users(id),
      session_id TEXT,provider_round_id TEXT NOT NULL,provider_game_id TEXT NOT NULL,currency TEXT NOT NULL CHECK (length(currency) BETWEEN 3 AND 8),
      status TEXT NOT NULL CHECK (status IN ('open','settled','rolled_back','reopened','review')),
      total_bet_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_bet_minor >= 0),total_win_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_win_minor >= 0),
      opened_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,closed_at BIGINT,
      FOREIGN KEY(session_id,profile_id,user_id) REFERENCES game_provider_sessions(id,profile_id,user_id),
      UNIQUE(profile_id,provider_round_id),UNIQUE(id,profile_id,user_id))`,
    "CREATE INDEX IF NOT EXISTS game_rounds_user_updated ON game_rounds(user_id,updated_at,id)",
    "CREATE INDEX IF NOT EXISTS game_rounds_profile_status ON game_rounds(profile_id,status,updated_at,id)",
    `CREATE TABLE IF NOT EXISTS game_transactions (
      id TEXT PRIMARY KEY NOT NULL,profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),user_id TEXT NOT NULL REFERENCES users(id),
      round_id TEXT NOT NULL,provider_transaction_id TEXT NOT NULL,parent_transaction_id TEXT REFERENCES game_transactions(id),
      parent_provider_transaction_id TEXT,event_type TEXT NOT NULL CHECK (event_type IN ('debit','credit','refund','rollback','adjustment','resettlement','transfer_result')),
      amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),currency TEXT NOT NULL CHECK (length(currency) BETWEEN 3 AND 8),
      request_fingerprint TEXT NOT NULL,status TEXT NOT NULL CHECK (status IN ('received','applied','duplicate','rejected','review')),
      provider_occurred_at BIGINT,received_at BIGINT NOT NULL,applied_at BIGINT,
      FOREIGN KEY(round_id,profile_id,user_id) REFERENCES game_rounds(id,profile_id,user_id),
      UNIQUE(profile_id,provider_transaction_id),UNIQUE(id,profile_id,user_id))`,
    "CREATE INDEX IF NOT EXISTS game_transactions_round ON game_transactions(round_id,received_at,id)",
    "CREATE INDEX IF NOT EXISTS game_transactions_profile_status ON game_transactions(profile_id,status,received_at,id)",
    `CREATE TABLE IF NOT EXISTS game_wallet_postings (
      id TEXT PRIMARY KEY NOT NULL,transaction_id TEXT NOT NULL,profile_id TEXT NOT NULL,user_id TEXT NOT NULL,
      account_code TEXT NOT NULL CHECK (account_code IN ('member','provider_game_clearing')),
      amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),currency TEXT NOT NULL CHECK (length(currency) BETWEEN 3 AND 8),created_at BIGINT NOT NULL,
      FOREIGN KEY(transaction_id,profile_id,user_id) REFERENCES game_transactions(id,profile_id,user_id),
      UNIQUE(transaction_id,account_code))`,
    "CREATE INDEX IF NOT EXISTS game_wallet_postings_user ON game_wallet_postings(user_id,currency,created_at,id)",
    "CREATE INDEX IF NOT EXISTS game_wallet_postings_profile ON game_wallet_postings(profile_id,created_at,id)",
    `CREATE TABLE IF NOT EXISTS game_callback_receipts (
      profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),event_key TEXT NOT NULL,provider_event_id TEXT,callback_type TEXT NOT NULL,
      payload_hash TEXT NOT NULL,payload_redacted_json TEXT NOT NULL DEFAULT '{}',
      signature_status TEXT NOT NULL CHECK (signature_status IN ('valid','invalid','not_applicable','unverified')),
      processing_status TEXT NOT NULL CHECK (processing_status IN ('received','processed','duplicate','rejected','review')),
      last_error_code TEXT NOT NULL DEFAULT '',received_at BIGINT NOT NULL,processed_at BIGINT,PRIMARY KEY(profile_id,event_key))`,
    "CREATE UNIQUE INDEX IF NOT EXISTS game_callback_receipts_provider_event ON game_callback_receipts(profile_id,provider_event_id,callback_type) WHERE provider_event_id IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS game_callback_receipts_status ON game_callback_receipts(profile_id,processing_status,received_at,event_key)",
    `CREATE TABLE IF NOT EXISTS game_wager_sync_cursors (
      profile_id TEXT PRIMARY KEY NOT NULL REFERENCES game_provider_profiles(id),cursor_value TEXT NOT NULL DEFAULT '',
      watermark_at BIGINT NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','syncing','review')),
      last_error_code TEXT NOT NULL DEFAULT '',last_success_at BIGINT NOT NULL DEFAULT 0,updated_at BIGINT NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS game_recovery_leases (
      profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),
      resource_type TEXT NOT NULL CHECK (resource_type IN ('session','transfer','transaction','wager_sync')),
      resource_id TEXT NOT NULL,claim_token TEXT NOT NULL DEFAULT '',locked_until BIGINT NOT NULL DEFAULT 0,
      last_checked_at BIGINT NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      PRIMARY KEY(profile_id,resource_type,resource_id))`,
    "CREATE INDEX IF NOT EXISTS game_recovery_leases_due ON game_recovery_leases(profile_id,resource_type,locked_until,last_checked_at,resource_id)",
  ];
  for(const statement of statements)await client.query(statement);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[GAME_PROVIDER_ADAPTER_CORE_MIGRATION]);
  return true;
}

async function applyNewMemberVoucherMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [NEW_MEMBER_VOUCHER_MIGRATION]);
  if (applied.rows.length) return false;
  const stamp = Math.floor(Date.now() / 1000);
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,$2)", [NEW_MEMBER_VOUCHER_MIGRATION, stamp]);
  return true;
}

async function applyFixedVoucherRetirementMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [FIXED_VOUCHER_RETIREMENT_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("UPDATE benefit_rules SET status='draft',updated_at=CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT) WHERE id='new-member-rm88-sponsored'");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [FIXED_VOUCHER_RETIREMENT_MIGRATION]);
  return true;
}

async function applyBenefitClaimReviewMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [BENEFIT_CLAIM_REVIEW_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE benefit_claims ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'");
  await client.query("ALTER TABLE benefit_claims ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES users(id)");
  await client.query("ALTER TABLE benefit_claims ADD COLUMN IF NOT EXISTS reviewed_at BIGINT");
  await client.query("ALTER TABLE benefit_claims ADD COLUMN IF NOT EXISTS review_note TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE benefit_claims DROP CONSTRAINT IF EXISTS benefit_claims_review_status_check");
  await client.query("ALTER TABLE benefit_claims ADD CONSTRAINT benefit_claims_review_status_check CHECK (review_status IN ('pending','approved_pending_settlement','rejected'))");
  await client.query("CREATE INDEX IF NOT EXISTS benefit_claims_review_queue ON benefit_claims(review_status,created_at DESC)");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [BENEFIT_CLAIM_REVIEW_MIGRATION]);
  return true;
}

async function applyVoucherManualWorkflowMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [VOUCHER_MANUAL_WORKFLOW_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query(`CREATE TABLE IF NOT EXISTS voucher_manual_reviews (
    claim_id TEXT PRIMARY KEY NOT NULL REFERENCES benefit_claims(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('approved','closed_no_win','turnover_review','eligible_for_payout','paid','rejected')),
    max_plays INTEGER NOT NULL CHECK (max_plays BETWEEN 1 AND 100),
    plays_used INTEGER NOT NULL DEFAULT 0 CHECK (plays_used >= 0 AND plays_used <= max_plays),
    won_once INTEGER NOT NULL DEFAULT 0 CHECK (won_once IN (0,1)),
    provider_credit_reference TEXT NOT NULL DEFAULT '',turnover_required_minor BIGINT NOT NULL CHECK (turnover_required_minor >= 0),
    turnover_verified_minor BIGINT NOT NULL DEFAULT 0 CHECK (turnover_verified_minor >= 0),turnover_evidence_reference TEXT NOT NULL DEFAULT '',
    payout_cap_minor BIGINT NOT NULL CHECK (payout_cap_minor > 0),payout_minor BIGINT NOT NULL DEFAULT 0 CHECK (payout_minor >= 0 AND payout_minor <= payout_cap_minor),
    payout_reference TEXT NOT NULL DEFAULT '',approved_by TEXT REFERENCES users(id),approved_at BIGINT,paid_by TEXT REFERENCES users(id),paid_at BIGINT,
    created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL)`);
  await client.query("CREATE INDEX IF NOT EXISTS voucher_manual_reviews_status ON voucher_manual_reviews(status,updated_at DESC)");
  await client.query(`CREATE TABLE IF NOT EXISTS voucher_manual_play_events (
    id TEXT PRIMARY KEY NOT NULL,claim_id TEXT NOT NULL REFERENCES voucher_manual_reviews(claim_id) ON DELETE CASCADE,
    play_number INTEGER NOT NULL CHECK (play_number BETWEEN 1 AND 100),outcome TEXT NOT NULL CHECK (outcome IN ('win','loss')),
    evidence_reference TEXT NOT NULL,recorded_by TEXT NOT NULL REFERENCES users(id),created_at BIGINT NOT NULL,UNIQUE(claim_id,play_number))`);
  await client.query("CREATE INDEX IF NOT EXISTS voucher_manual_play_events_claim ON voucher_manual_play_events(claim_id,play_number)");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [VOUCHER_MANUAL_WORKFLOW_MIGRATION]);
  return true;
}

async function applyPayoutControlMigration(client) {
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [PAYOUT_CONTROL_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query("ALTER TABLE provider_payout_controls DROP CONSTRAINT IF EXISTS provider_payout_controls_submission_enabled_check");
  await client.query("ALTER TABLE provider_payout_controls ADD CONSTRAINT provider_payout_controls_submission_enabled_check CHECK (submission_enabled=0 OR (provider_id='gspay' AND submission_enabled=1))");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [PAYOUT_CONTROL_MIGRATION]);
  return true;
}

async function applyGSPayPayoutActivation(client, options) {
  if (options.gspayPayoutEnabled !== true) return false;
  const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [GSPAY_PAYOUT_ACTIVATION_MIGRATION]);
  if (applied.rows.length) return false;
  await client.query(`INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
    SELECT $1,'provider_payout_controls',provider_id,to_jsonb(p),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
    FROM provider_payout_controls p WHERE provider_id='gspay'
    ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`, [GSPAY_PAYOUT_ACTIVATION_MIGRATION]);
  await client.query("UPDATE provider_payout_controls SET submission_enabled=1,updated_at=CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT) WHERE provider_id='gspay'");
  await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [GSPAY_PAYOUT_ACTIVATION_MIGRATION]);
  return true;
}

async function applyExplicitPaymentChannelActivations(client, options) {
  const requested = [
    ["vpay", options.vpayEnabled === true],
    ["1mpay", options.oneMpayEnabled === true],
    ["gspay", options.gspayEnabled === true],
  ];
  for (const [providerId, enabled] of requested) {
    if (!enabled) continue;
    const version = PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS[providerId];
    const applied = await client.query("SELECT version FROM portal_schema_migrations WHERE version=$1", [version]);
    if (applied.rows.length) continue;
    // This marker is deliberately per provider. It applies an explicit
    // environment decision once, then leaves every later owner
    // Active/Maintenance/Close choice untouched across restarts.
    await client.query(`INSERT INTO portal_status_snapshots(migration_version,entity_type,entity_key,row_data,captured_at)
      SELECT $1,'payment_channel_controls',provider_id,to_jsonb(p),CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
      FROM payment_channel_controls p WHERE provider_id=$2
      ON CONFLICT(migration_version,entity_type,entity_key) DO NOTHING`, [version, providerId]);
    await client.query(`UPDATE payment_channel_controls
      SET status='active',updated_by='system:explicit-orders-enabled',updated_at=CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
      WHERE provider_id=$1`, [providerId]);
    await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))", [version]);
  }
}


export const MANUAL_BANK_FUNDS_MIGRATION='0115-manual-bank-funds';
async function applyManualBankFundsMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[MANUAL_BANK_FUNDS_MIGRATION]);
 if(applied.rows.length)return false;
 for(const [table,constraint,allowed] of [
  ['withdrawal_requests','withdrawal_requests_provider_id_check',"'vpay','gspay','1mpay','gspay_plus','manual_bank'"],
  ['provider_payouts','provider_payouts_provider_id_check',"'vpay','gspay','1mpay','manual_bank'"],
  ['provider_payout_controls','provider_payout_controls_provider_id_check',"'vpay','gspay','1mpay','manual_bank'"],
 ]){
  await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`);
  await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} CHECK(provider_id IN (${allowed}))`);
 }
 await client.query('ALTER TABLE provider_payout_controls DROP CONSTRAINT IF EXISTS provider_payout_controls_check');
 await client.query('ALTER TABLE provider_payout_controls DROP CONSTRAINT IF EXISTS provider_payout_controls_submission_enabled_check');
 await client.query("ALTER TABLE provider_payout_controls ADD CONSTRAINT provider_payout_controls_submission_enabled_check CHECK(submission_enabled=0 OR (provider_id IN ('gspay','manual_bank') AND submission_enabled=1))");
 await client.query('ALTER TABLE company_bank_accounts ADD COLUMN IF NOT EXISTS supersedes_id TEXT REFERENCES company_bank_accounts(id) DEFERRABLE INITIALLY DEFERRED');
 await client.query('ALTER TABLE provider_payouts ADD COLUMN IF NOT EXISTS manual_bank_account_id TEXT REFERENCES company_bank_accounts(id)');
 await client.query("INSERT INTO provider_payout_controls(provider_id,submission_enabled,updated_at) VALUES('manual_bank',0,0) ON CONFLICT(provider_id) DO NOTHING");
 await client.query("CREATE UNIQUE INDEX IF NOT EXISTS company_bank_successor ON company_bank_accounts(supersedes_id) WHERE supersedes_id IS NOT NULL");
 await client.query(`CREATE TABLE IF NOT EXISTS manual_bank_transactions (
 id TEXT PRIMARY KEY NOT NULL,
 bank_account_id TEXT NOT NULL REFERENCES company_bank_accounts(id),
 bank_account_key TEXT NOT NULL CHECK(length(bank_account_key)=64),
 bank_reference TEXT NOT NULL CHECK(length(bank_reference) BETWEEN 4 AND 100),
 normalized_reference TEXT NOT NULL CHECK(length(normalized_reference) BETWEEN 4 AND 100),
 direction TEXT NOT NULL CHECK(direction IN ('deposit','withdrawal')),
 amount_minor BIGINT NOT NULL CHECK(amount_minor>0 AND amount_minor<=10000000),
 currency TEXT NOT NULL CHECK(currency='MYR'),
 deposit_order_id TEXT UNIQUE REFERENCES deposit_orders(id),
 payout_id TEXT UNIQUE REFERENCES provider_payouts(id),
 proof_data TEXT NOT NULL CHECK(length(proof_data)>0),
 proof_sha256 TEXT NOT NULL CHECK(length(proof_sha256)=64),
 bank_occurred_at BIGINT NOT NULL CHECK(bank_occurred_at>=1577836800),
 recorded_by TEXT NOT NULL REFERENCES users(id),
 recorded_at BIGINT NOT NULL,
 CHECK((direction='deposit' AND deposit_order_id IS NOT NULL AND payout_id IS NULL) OR
       (direction='withdrawal' AND payout_id IS NOT NULL AND deposit_order_id IS NULL)),
 UNIQUE(bank_account_key,normalized_reference)
);
CREATE INDEX IF NOT EXISTS manual_bank_transactions_recorded ON manual_bank_transactions(recorded_at DESC,id);
`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[MANUAL_BANK_FUNDS_MIGRATION]);
 return true;
}

export const PROVIDER_WALLET_OPERATIONS_MIGRATION='0116-provider-wallet-operations';
async function applyProviderWalletOperationsMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[PROVIDER_WALLET_OPERATIONS_MIGRATION]);if(applied.rows.length)return false;
 await client.query('ALTER TABLE game_wallet_sessions DROP CONSTRAINT IF EXISTS game_wallet_sessions_provider_check');
 await client.query('ALTER TABLE game_wallet_sessions ADD COLUMN IF NOT EXISTS profile_id TEXT REFERENCES game_provider_profiles(id) DEFERRABLE INITIALLY DEFERRED');
 await client.query(`CREATE TABLE IF NOT EXISTS provider_wallet_operations (
 session_id TEXT PRIMARY KEY NOT NULL REFERENCES game_wallet_sessions(id),
 profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 request_key TEXT NOT NULL,
 request_fingerprint TEXT NOT NULL,
 deposit_state TEXT NOT NULL CHECK(deposit_state IN ('prepared','submitting','unknown','confirmed','rejected','review')),
 deposit_attempts INTEGER NOT NULL DEFAULT 0 CHECK(deposit_attempts BETWEEN 0 AND 1),
 deposit_provider_reference TEXT,
 withdrawal_state TEXT NOT NULL DEFAULT 'none' CHECK(withdrawal_state IN ('none','prepared','submitting','unknown','confirmed','rejected','review')),
 withdrawal_attempts INTEGER NOT NULL DEFAULT 0 CHECK(withdrawal_attempts BETWEEN 0 AND 1),
 withdrawal_provider_reference TEXT,
 launch_state TEXT NOT NULL DEFAULT 'prepared' CHECK(launch_state IN ('prepared','launching','issued','unknown','closed')),
 closure_state TEXT NOT NULL DEFAULT 'unknown' CHECK(closure_state IN ('unknown','confirmed')),
 closure_evidence TEXT NOT NULL DEFAULT '',
 zero_balance_verified INTEGER NOT NULL DEFAULT 0 CHECK(zero_balance_verified IN (0,1)),
 last_error_code TEXT NOT NULL DEFAULT '',
 created_at BIGINT NOT NULL,
 updated_at BIGINT NOT NULL,
 UNIQUE(profile_id,request_key)
);
CREATE INDEX IF NOT EXISTS provider_wallet_operations_user ON provider_wallet_operations(user_id,profile_id,updated_at);
`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[PROVIDER_WALLET_OPERATIONS_MIGRATION]);return true;
}

export const PROVIDER_WALLET_SWEEPS_MIGRATION='0120-provider-wallet-sweeps';
async function applyProviderWalletSweepsMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[PROVIDER_WALLET_SWEEPS_MIGRATION]);if(applied.rows.length)return false;
 await client.query("ALTER TABLE provider_wallet_operations ADD COLUMN IF NOT EXISTS withdrawal_mode TEXT NOT NULL DEFAULT 'exact' CHECK(withdrawal_mode IN ('exact','all'))");
 await client.query("ALTER TABLE provider_wallet_operations ADD COLUMN IF NOT EXISTS adapter_contract_sha256 TEXT NOT NULL DEFAULT '' CHECK(adapter_contract_sha256='' OR adapter_contract_sha256 ~ '^[a-f0-9]{64}$')");
 await client.query(`CREATE OR REPLACE FUNCTION reject_provider_wallet_contract_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN IF NEW.withdrawal_mode<>OLD.withdrawal_mode OR NEW.adapter_contract_sha256<>OLD.adapter_contract_sha256 THEN RAISE EXCEPTION 'provider wallet contract is immutable'; END IF; RETURN NEW; END $$;
 DROP TRIGGER IF EXISTS provider_wallet_contract_immutable ON provider_wallet_operations;
 CREATE TRIGGER provider_wallet_contract_immutable BEFORE UPDATE OF withdrawal_mode,adapter_contract_sha256 ON provider_wallet_operations FOR EACH ROW EXECUTE FUNCTION reject_provider_wallet_contract_mutation();`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[PROVIDER_WALLET_SWEEPS_MIGRATION]);return true;
}

export const JDB_WAGER_COVERAGE_STAGING_MIGRATION='0121-jdb-wager-coverage-staging';
async function applyJdbWagerCoverageStagingMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[JDB_WAGER_COVERAGE_STAGING_MIGRATION]);if(applied.rows.length)return false;
 await client.query(`CREATE TABLE IF NOT EXISTS jdb_wager_sync_windows (
  window_id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),
  time_basis TEXT NOT NULL CHECK (time_basis IN ('lastModifyTime','gameDate')),
  window_start_ms BIGINT NOT NULL CHECK (window_start_ms >= 0),
  window_end_ms BIGINT NOT NULL CHECK (window_end_ms > window_start_ms),
  state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN ('idle','syncing','review')),
  current_fence BIGINT NOT NULL DEFAULT 0 CHECK (current_fence >= 0),
  last_receipt_id TEXT,
  last_error_code TEXT,
  created_at BIGINT NOT NULL CHECK (created_at >= 0),
  updated_at BIGINT NOT NULL CHECK (updated_at >= created_at),
  CHECK ((time_basis='lastModifyTime' AND window_end_ms-window_start_ms <= 900000) OR (time_basis='gameDate' AND window_end_ms-window_start_ms <= 300000)),
  UNIQUE (profile_id,time_basis,window_start_ms,window_end_ms),
  UNIQUE (window_id,profile_id)
);

CREATE INDEX IF NOT EXISTS jdb_wager_sync_windows_range
  ON jdb_wager_sync_windows(profile_id,time_basis,window_start_ms,window_end_ms);

CREATE TABLE IF NOT EXISTS jdb_wager_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  window_id TEXT NOT NULL REFERENCES jdb_wager_sync_windows(window_id),
  profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),
  fence BIGINT NOT NULL CHECK (fence > 0),
  claim_token_sha256 TEXT NOT NULL CHECK (length(claim_token_sha256) = 64),
  page_sha256 TEXT NOT NULL CHECK (length(page_sha256) = 64),
  input_count INTEGER NOT NULL DEFAULT 0 CHECK (input_count >= 0),
  unique_input_count INTEGER NOT NULL DEFAULT 0 CHECK (unique_input_count >= 0 AND unique_input_count <= input_count),
  original_count INTEGER NOT NULL DEFAULT 0 CHECK (original_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  late_count INTEGER NOT NULL DEFAULT 0 CHECK (late_count >= 0),
  revision_count INTEGER NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
  reversal_candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (reversal_candidate_count >= 0),
  page_complete INTEGER NOT NULL DEFAULT 0 CHECK (page_complete = 0),
  source_finality_verified INTEGER NOT NULL DEFAULT 0 CHECK (source_finality_verified = 0),
  session_closure_verified INTEGER NOT NULL DEFAULT 0 CHECK (session_closure_verified = 0),
  merchant_authorization_verified INTEGER NOT NULL DEFAULT 0 CHECK (merchant_authorization_verified = 0),
  coverage_complete INTEGER NOT NULL DEFAULT 0 CHECK (coverage_complete = 0),
  status TEXT NOT NULL DEFAULT 'review' CHECK (status = 'review'),
  observed_at BIGINT NOT NULL CHECK (observed_at >= 0),
  FOREIGN KEY (window_id,profile_id) REFERENCES jdb_wager_sync_windows(window_id,profile_id),
  UNIQUE (window_id,fence),
  UNIQUE (window_id,page_sha256)
);

CREATE INDEX IF NOT EXISTS jdb_wager_receipts_window
  ON jdb_wager_receipts(window_id,observed_at,id);

CREATE TABLE IF NOT EXISTS jdb_wager_identities (
  identity_sha256 TEXT PRIMARY KEY NOT NULL CHECK (length(identity_sha256) = 64),
  profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),
  first_payload_sha256 TEXT NOT NULL CHECK (length(first_payload_sha256) = 64),
  first_receipt_id TEXT NOT NULL REFERENCES jdb_wager_receipts(id),
  first_observed_at BIGINT NOT NULL CHECK (first_observed_at >= 0),
  UNIQUE (identity_sha256,profile_id)
);

CREATE TABLE IF NOT EXISTS jdb_wager_event_versions (
  identity_sha256 TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  profile_id TEXT NOT NULL REFERENCES game_provider_profiles(id),
  provider_round_sha256 TEXT CHECK (provider_round_sha256 IS NULL OR length(provider_round_sha256) = 64),
  provider_player_sha256 TEXT NOT NULL CHECK (length(provider_player_sha256) = 64),
  provider_game_sha256 TEXT NOT NULL CHECK (length(provider_game_sha256) = 64),
  bet_minor BIGINT NOT NULL CHECK (bet_minor >= 0),
  win_minor BIGINT NOT NULL CHECK (win_minor >= 0),
  currency TEXT NOT NULL CHECK (currency = 'MYR'),
  settled_at_ms BIGINT NOT NULL CHECK (settled_at_ms >= 0),
  source_details_sha256 TEXT NOT NULL CHECK (length(source_details_sha256) = 64),
  classification TEXT NOT NULL CHECK (classification IN ('original','late','revision','reversal_candidate')),
  first_receipt_id TEXT NOT NULL REFERENCES jdb_wager_receipts(id),
  first_observed_at BIGINT NOT NULL CHECK (first_observed_at >= 0),
  PRIMARY KEY (identity_sha256,payload_sha256),
  FOREIGN KEY (identity_sha256,profile_id) REFERENCES jdb_wager_identities(identity_sha256,profile_id)
);

CREATE INDEX IF NOT EXISTS jdb_wager_event_versions_observed
  ON jdb_wager_event_versions(profile_id,classification,first_observed_at,identity_sha256,payload_sha256);

CREATE TABLE IF NOT EXISTS jdb_wager_observations (
  receipt_id TEXT NOT NULL REFERENCES jdb_wager_receipts(id),
  identity_sha256 TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('original','duplicate','late','revision','reversal_candidate')),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  PRIMARY KEY (receipt_id,identity_sha256,payload_sha256),
  FOREIGN KEY (identity_sha256,payload_sha256)
    REFERENCES jdb_wager_event_versions(identity_sha256,payload_sha256)
);

CREATE INDEX IF NOT EXISTS jdb_wager_observations_receipt
  ON jdb_wager_observations(receipt_id,classification,identity_sha256,payload_sha256);`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[JDB_WAGER_COVERAGE_STAGING_MIGRATION]);return true;
}

export const ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION='0122-acceptance-ledger-integrity';
async function applyAcceptanceLedgerIntegrityMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION]);if(applied.rows.length)return false;
 await client.query(`DO $$
 BEGIN
  IF EXISTS (
   SELECT 1 FROM (
    SELECT profile_id,capability,environment,MIN(revision) minimum_revision,MAX(revision) maximum_revision,COUNT(*) history_count
    FROM game_provider_acceptance_events GROUP BY profile_id,capability,environment
   ) history
   LEFT JOIN game_provider_acceptance_current c ON c.profile_id=history.profile_id AND c.capability=history.capability AND c.environment=history.environment
   LEFT JOIN game_provider_acceptance_events selected ON selected.id=c.event_id
    AND selected.profile_id=history.profile_id AND selected.capability=history.capability AND selected.environment=history.environment
   WHERE history.minimum_revision<>1 OR history.history_count<>history.maximum_revision
    OR selected.id IS NULL OR selected.revision<>history.maximum_revision
  ) THEN RAISE EXCEPTION 'game provider acceptance projection is not current'; END IF;
  IF EXISTS (
   SELECT 1 FROM (
    SELECT category,subject_id,capability,environment,MIN(revision) minimum_revision,MAX(revision) maximum_revision,COUNT(*) history_count
    FROM production_acceptance_events GROUP BY category,subject_id,capability,environment
   ) history
   LEFT JOIN production_acceptance_current c ON c.category=history.category AND c.subject_id=history.subject_id
    AND c.capability=history.capability AND c.environment=history.environment
   LEFT JOIN production_acceptance_events selected ON selected.id=c.event_id
    AND selected.category=history.category AND selected.subject_id=history.subject_id
    AND selected.capability=history.capability AND selected.environment=history.environment
   WHERE history.minimum_revision<>1 OR history.history_count<>history.maximum_revision
    OR selected.id IS NULL OR selected.revision<>history.maximum_revision
  ) THEN RAISE EXCEPTION 'production acceptance projection is not current'; END IF;
 END $$;`);
 await client.query(`CREATE OR REPLACE FUNCTION guard_game_provider_acceptance_event() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE latest_revision INTEGER;
 BEGIN
  IF TG_OP IN ('UPDATE','DELETE','TRUNCATE') THEN RAISE EXCEPTION 'game provider acceptance history is immutable' USING ERRCODE='55000'; END IF;
  SELECT MAX(revision) INTO latest_revision FROM game_provider_acceptance_events
   WHERE profile_id=NEW.profile_id AND capability=NEW.capability AND environment=NEW.environment;
  IF NEW.revision<>COALESCE(latest_revision,0)+1 THEN RAISE EXCEPTION 'game provider acceptance history revisions must be contiguous' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END $$;
 DROP TRIGGER IF EXISTS game_provider_acceptance_events_immutable ON game_provider_acceptance_events;
 CREATE TRIGGER game_provider_acceptance_events_immutable BEFORE INSERT OR UPDATE OR DELETE ON game_provider_acceptance_events
  FOR EACH ROW EXECUTE FUNCTION guard_game_provider_acceptance_event();
 DROP TRIGGER IF EXISTS game_provider_acceptance_events_no_truncate ON game_provider_acceptance_events;
 CREATE TRIGGER game_provider_acceptance_events_no_truncate BEFORE TRUNCATE ON game_provider_acceptance_events
  FOR EACH STATEMENT EXECUTE FUNCTION guard_game_provider_acceptance_event();
 CREATE OR REPLACE FUNCTION guard_production_acceptance_event() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE latest_revision INTEGER;
 BEGIN
  IF TG_OP IN ('UPDATE','DELETE','TRUNCATE') THEN RAISE EXCEPTION 'production acceptance history is immutable' USING ERRCODE='55000'; END IF;
  SELECT MAX(revision) INTO latest_revision FROM production_acceptance_events
   WHERE category=NEW.category AND subject_id=NEW.subject_id AND capability=NEW.capability AND environment=NEW.environment;
  IF NEW.revision<>COALESCE(latest_revision,0)+1 THEN RAISE EXCEPTION 'production acceptance history revisions must be contiguous' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END $$;
 DROP TRIGGER IF EXISTS production_acceptance_events_immutable ON production_acceptance_events;
 CREATE TRIGGER production_acceptance_events_immutable BEFORE INSERT OR UPDATE OR DELETE ON production_acceptance_events
  FOR EACH ROW EXECUTE FUNCTION guard_production_acceptance_event();
 DROP TRIGGER IF EXISTS production_acceptance_events_no_truncate ON production_acceptance_events;
 CREATE TRIGGER production_acceptance_events_no_truncate BEFORE TRUNCATE ON production_acceptance_events
  FOR EACH STATEMENT EXECUTE FUNCTION guard_production_acceptance_event();`);
 await client.query(`CREATE OR REPLACE FUNCTION guard_game_provider_acceptance_current() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE previous_revision INTEGER; next_revision INTEGER; latest_revision INTEGER; minimum_revision INTEGER; history_count BIGINT;
 BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'game provider acceptance projection cannot be deleted or truncated' USING ERRCODE='55000'; END IF;
  SELECT revision INTO next_revision FROM game_provider_acceptance_events
   WHERE id=NEW.event_id AND profile_id=NEW.profile_id AND capability=NEW.capability AND environment=NEW.environment;
  SELECT MIN(revision),MAX(revision),COUNT(*) INTO minimum_revision,latest_revision,history_count FROM game_provider_acceptance_events
   WHERE profile_id=NEW.profile_id AND capability=NEW.capability AND environment=NEW.environment;
  IF next_revision IS NULL OR minimum_revision<>1 OR history_count<>latest_revision OR next_revision<>latest_revision THEN
   RAISE EXCEPTION 'game provider acceptance projection must reference the latest revision' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.profile_id<>OLD.profile_id OR NEW.capability<>OLD.capability OR NEW.environment<>OLD.environment THEN
    RAISE EXCEPTION 'game provider acceptance projection key is immutable' USING ERRCODE='55000';
   END IF;
   SELECT revision INTO previous_revision FROM game_provider_acceptance_events WHERE id=OLD.event_id;
   IF previous_revision IS NULL OR next_revision<>previous_revision+1 THEN
    RAISE EXCEPTION 'game provider acceptance projection must advance exactly one revision' USING ERRCODE='55000';
   END IF;
  END IF;
  RETURN NEW;
 END $$;
 DROP TRIGGER IF EXISTS game_provider_acceptance_current_monotonic ON game_provider_acceptance_current;
 CREATE TRIGGER game_provider_acceptance_current_monotonic BEFORE INSERT OR UPDATE OR DELETE ON game_provider_acceptance_current
  FOR EACH ROW EXECUTE FUNCTION guard_game_provider_acceptance_current();
 DROP TRIGGER IF EXISTS game_provider_acceptance_current_no_truncate ON game_provider_acceptance_current;
 CREATE TRIGGER game_provider_acceptance_current_no_truncate BEFORE TRUNCATE ON game_provider_acceptance_current
  FOR EACH STATEMENT EXECUTE FUNCTION guard_game_provider_acceptance_current();`);
 await client.query(`CREATE OR REPLACE FUNCTION guard_production_acceptance_current() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE previous_revision INTEGER; next_revision INTEGER; latest_revision INTEGER; minimum_revision INTEGER; history_count BIGINT;
 BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'production acceptance projection cannot be deleted or truncated' USING ERRCODE='55000'; END IF;
  SELECT revision INTO next_revision FROM production_acceptance_events
   WHERE id=NEW.event_id AND category=NEW.category AND subject_id=NEW.subject_id
    AND capability=NEW.capability AND environment=NEW.environment;
  SELECT MIN(revision),MAX(revision),COUNT(*) INTO minimum_revision,latest_revision,history_count FROM production_acceptance_events
   WHERE category=NEW.category AND subject_id=NEW.subject_id
    AND capability=NEW.capability AND environment=NEW.environment;
  IF next_revision IS NULL OR minimum_revision<>1 OR history_count<>latest_revision OR next_revision<>latest_revision THEN
   RAISE EXCEPTION 'production acceptance projection must reference the latest revision' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.category<>OLD.category OR NEW.subject_id<>OLD.subject_id OR NEW.capability<>OLD.capability OR NEW.environment<>OLD.environment THEN
    RAISE EXCEPTION 'production acceptance projection key is immutable' USING ERRCODE='55000';
   END IF;
   SELECT revision INTO previous_revision FROM production_acceptance_events WHERE id=OLD.event_id;
   IF previous_revision IS NULL OR next_revision<>previous_revision+1 THEN
    RAISE EXCEPTION 'production acceptance projection must advance exactly one revision' USING ERRCODE='55000';
   END IF;
  END IF;
  RETURN NEW;
 END $$;
 DROP TRIGGER IF EXISTS production_acceptance_current_monotonic ON production_acceptance_current;
 CREATE TRIGGER production_acceptance_current_monotonic BEFORE INSERT OR UPDATE OR DELETE ON production_acceptance_current
  FOR EACH ROW EXECUTE FUNCTION guard_production_acceptance_current();
 DROP TRIGGER IF EXISTS production_acceptance_current_no_truncate ON production_acceptance_current;
 CREATE TRIGGER production_acceptance_current_no_truncate BEFORE TRUNCATE ON production_acceptance_current
  FOR EACH STATEMENT EXECUTE FUNCTION guard_production_acceptance_current();`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION]);return true;
}

export const GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION='0123-guard-function-schema-binding';
async function applyGuardFunctionSchemaBindingMigration(client,schemaName){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION]);if(applied.rows.length)return false;
 const qualifiedSchema=`"${schemaName.replaceAll('"','""')}"`;
 for(const name of ['reject_provider_wallet_contract_mutation','guard_game_provider_acceptance_event','guard_production_acceptance_event','guard_game_provider_acceptance_current','guard_production_acceptance_current']){
  await client.query(`CREATE OR REPLACE FUNCTION ${qualifiedSchema}.${name}() RETURNS trigger
   LANGUAGE plpgsql VOLATILE NOT LEAKPROOF CALLED ON NULL INPUT SECURITY INVOKER PARALLEL UNSAFE
   SET search_path = pg_catalog, pg_temp AS $$
${requiredCriticalDatabaseGuardFunctionSource(name)}
$$`);
 }
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION]);return true;
}

export const MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION='0124-manual-bank-audit-evidence-index';
async function applyManualBankAuditEvidenceIndexMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION]);if(applied.rows.length)return false;
 await client.query("CREATE INDEX IF NOT EXISTS audit_manual_bank_payout_paid_evidence ON audit(target,user_id,created_at) WHERE event='manual_bank_payout_paid'");
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION]);return true;
}

export const PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION='0125-privileged-staff-password-boundary';
async function applyPrivilegedStaffPasswordBoundaryMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION]);if(applied.rows.length)return false;
 const legacy=(await client.query(`SELECT c.user_id,c.version
  FROM password_credentials c JOIN users u ON u.id=c.user_id
  LEFT JOIN settings ready ON ready.id='staff_password_ready:'||c.user_id AND ready.value=CAST(c.version AS TEXT)
  WHERE u.role='staff' AND u.id<>'system-support-assistant' AND ready.id IS NULL
  ORDER BY c.user_id FOR UPDATE OF c,u`)).rows;
 const timestamp=Math.floor(Date.now()/1000);
 for(const row of legacy){
  const userId=String(row.user_id),version=Number(row.version);if(!userId||!Number.isSafeInteger(version)||version<1)throw new Error('Legacy staff credential is invalid');
  const nextVersion=version+1,salt=randomBytes(32).toString('base64url'),unusableHash=randomBytes(32).toString('hex'),setupKey=`staff_password_setup:${userId}`,readyKey=`staff_password_ready:${userId}`;
  const setup=JSON.stringify({userId,tokenHash:randomBytes(32).toString('hex'),credentialVersion:nextVersion,issuedAt:timestamp-7200,expiresAt:timestamp-3600});
  const updated=await client.query('UPDATE password_credentials SET salt=$1,password_hash=$2,version=version+1,changed_at=$3 WHERE user_id=$4 AND version=$5 RETURNING version',[salt,unusableHash,timestamp,userId,version]);
  if(updated.rows.length!==1||Number(updated.rows[0].version)!==nextVersion)throw new Error('Legacy staff credential changed during migration');
  await client.query('DELETE FROM password_sessions WHERE user_id=$1',[userId]);
  await client.query('DELETE FROM settings WHERE id=$1',[readyKey]);
  await client.query('INSERT INTO settings(id,value) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET value=excluded.value',[setupKey,setup]);
  await client.query("INSERT INTO audit(id,user_id,event,target,created_at) VALUES($1,$2,'legacy_staff_password_disabled','account',$3)",[randomUUID(),userId,timestamp]);
 }
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION]);return true;
}

export const canonicalizeCriticalDatabaseGuardFunctionSource=value=>String(value??'').replace(/\r\n/g,'\n').trim();
export const criticalDatabaseGuardFunctionSourceSha256=value=>createHash('sha256').update(canonicalizeCriticalDatabaseGuardFunctionSource(value)).digest('hex');
export const CRITICAL_DATABASE_GUARD_FUNCTION_CONFIG=Object.freeze(['search_path=pg_catalog, pg_temp']);

export const CRITICAL_DATABASE_GUARD_FUNCTIONS=Object.freeze([
 Object.freeze({name:'reject_provider_wallet_contract_mutation',identityArguments:'',language:'plpgsql',returnType:'trigger',kind:'f',volatility:'v',parallelSafety:'u',securityDefiner:false,leakproof:false,strict:false,returnsSet:false,config:CRITICAL_DATABASE_GUARD_FUNCTION_CONFIG,source:`BEGIN IF NEW.withdrawal_mode<>OLD.withdrawal_mode OR NEW.adapter_contract_sha256<>OLD.adapter_contract_sha256 THEN RAISE EXCEPTION 'provider wallet contract is immutable'; END IF; RETURN NEW; END`,sourceSha256:'953c05ab59c8ab8fcee8feab8733a079e99d7335245f92d4b89b43c12e2989c7'}),
 Object.freeze({name:'guard_game_provider_acceptance_event',identityArguments:'',language:'plpgsql',returnType:'trigger',kind:'f',volatility:'v',parallelSafety:'u',securityDefiner:false,leakproof:false,strict:false,returnsSet:false,config:CRITICAL_DATABASE_GUARD_FUNCTION_CONFIG,source:`DECLARE latest_revision INTEGER;
 BEGIN
  IF TG_OP IN ('UPDATE','DELETE','TRUNCATE') THEN RAISE EXCEPTION 'game provider acceptance history is immutable' USING ERRCODE='55000'; END IF;
  EXECUTE pg_catalog.format(
   'SELECT MAX(revision) FROM %I.%I WHERE profile_id=$1 AND capability=$2 AND environment=$3',
   TG_TABLE_SCHEMA,'game_provider_acceptance_events'
  ) INTO latest_revision USING NEW.profile_id,NEW.capability,NEW.environment;
  IF NEW.revision<>COALESCE(latest_revision,0)+1 THEN RAISE EXCEPTION 'game provider acceptance history revisions must be contiguous' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END`,sourceSha256:'fcc34ad74d303220023ada6cd1713024e80a62550d493a8c13e2244ecf69f2f8'}),
 Object.freeze({name:'guard_production_acceptance_event',identityArguments:'',language:'plpgsql',returnType:'trigger',kind:'f',volatility:'v',parallelSafety:'u',securityDefiner:false,leakproof:false,strict:false,returnsSet:false,config:CRITICAL_DATABASE_GUARD_FUNCTION_CONFIG,source:`DECLARE latest_revision INTEGER;
 BEGIN
  IF TG_OP IN ('UPDATE','DELETE','TRUNCATE') THEN RAISE EXCEPTION 'production acceptance history is immutable' USING ERRCODE='55000'; END IF;
  EXECUTE pg_catalog.format(
   'SELECT MAX(revision) FROM %I.%I WHERE category=$1 AND subject_id=$2 AND capability=$3 AND environment=$4',
   TG_TABLE_SCHEMA,'production_acceptance_events'
  ) INTO latest_revision USING NEW.category,NEW.subject_id,NEW.capability,NEW.environment;
  IF NEW.revision<>COALESCE(latest_revision,0)+1 THEN RAISE EXCEPTION 'production acceptance history revisions must be contiguous' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END`,sourceSha256:'d3dcbc475023e811fe123028c194cfd0d8446ec08bedcc62890434109d273bad'}),
 Object.freeze({name:'guard_game_provider_acceptance_current',identityArguments:'',language:'plpgsql',returnType:'trigger',kind:'f',volatility:'v',parallelSafety:'u',securityDefiner:false,leakproof:false,strict:false,returnsSet:false,config:CRITICAL_DATABASE_GUARD_FUNCTION_CONFIG,source:`DECLARE previous_revision INTEGER; next_revision INTEGER; latest_revision INTEGER; minimum_revision INTEGER; history_count BIGINT;
 BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'game provider acceptance projection cannot be deleted or truncated' USING ERRCODE='55000'; END IF;
  EXECUTE pg_catalog.format(
   'SELECT revision FROM %I.%I WHERE id=$1 AND profile_id=$2 AND capability=$3 AND environment=$4',
   TG_TABLE_SCHEMA,'game_provider_acceptance_events'
  ) INTO next_revision USING NEW.event_id,NEW.profile_id,NEW.capability,NEW.environment;
  EXECUTE pg_catalog.format(
   'SELECT MIN(revision),MAX(revision),COUNT(*) FROM %I.%I WHERE profile_id=$1 AND capability=$2 AND environment=$3',
   TG_TABLE_SCHEMA,'game_provider_acceptance_events'
  ) INTO minimum_revision,latest_revision,history_count USING NEW.profile_id,NEW.capability,NEW.environment;
  IF next_revision IS NULL OR minimum_revision<>1 OR history_count<>latest_revision OR next_revision<>latest_revision THEN
   RAISE EXCEPTION 'game provider acceptance projection must reference the latest revision' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.profile_id<>OLD.profile_id OR NEW.capability<>OLD.capability OR NEW.environment<>OLD.environment THEN
    RAISE EXCEPTION 'game provider acceptance projection key is immutable' USING ERRCODE='55000';
   END IF;
   EXECUTE pg_catalog.format('SELECT revision FROM %I.%I WHERE id=$1',TG_TABLE_SCHEMA,'game_provider_acceptance_events')
    INTO previous_revision USING OLD.event_id;
   IF previous_revision IS NULL OR next_revision<>previous_revision+1 THEN
    RAISE EXCEPTION 'game provider acceptance projection must advance exactly one revision' USING ERRCODE='55000';
   END IF;
  END IF;
  RETURN NEW;
 END`,sourceSha256:'4f6ee9b06e91ace5e4c28bc5a7d058a02c6f185fa84379184abad4e59bbf4bd8'}),
 Object.freeze({name:'guard_production_acceptance_current',identityArguments:'',language:'plpgsql',returnType:'trigger',kind:'f',volatility:'v',parallelSafety:'u',securityDefiner:false,leakproof:false,strict:false,returnsSet:false,config:CRITICAL_DATABASE_GUARD_FUNCTION_CONFIG,source:`DECLARE previous_revision INTEGER; next_revision INTEGER; latest_revision INTEGER; minimum_revision INTEGER; history_count BIGINT;
 BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'production acceptance projection cannot be deleted or truncated' USING ERRCODE='55000'; END IF;
  EXECUTE pg_catalog.format(
   'SELECT revision FROM %I.%I WHERE id=$1 AND category=$2 AND subject_id=$3 AND capability=$4 AND environment=$5',
   TG_TABLE_SCHEMA,'production_acceptance_events'
  ) INTO next_revision USING NEW.event_id,NEW.category,NEW.subject_id,NEW.capability,NEW.environment;
  EXECUTE pg_catalog.format(
   'SELECT MIN(revision),MAX(revision),COUNT(*) FROM %I.%I WHERE category=$1 AND subject_id=$2 AND capability=$3 AND environment=$4',
   TG_TABLE_SCHEMA,'production_acceptance_events'
  ) INTO minimum_revision,latest_revision,history_count USING NEW.category,NEW.subject_id,NEW.capability,NEW.environment;
  IF next_revision IS NULL OR minimum_revision<>1 OR history_count<>latest_revision OR next_revision<>latest_revision THEN
   RAISE EXCEPTION 'production acceptance projection must reference the latest revision' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.category<>OLD.category OR NEW.subject_id<>OLD.subject_id OR NEW.capability<>OLD.capability OR NEW.environment<>OLD.environment THEN
    RAISE EXCEPTION 'production acceptance projection key is immutable' USING ERRCODE='55000';
   END IF;
   EXECUTE pg_catalog.format('SELECT revision FROM %I.%I WHERE id=$1',TG_TABLE_SCHEMA,'production_acceptance_events')
    INTO previous_revision USING OLD.event_id;
   IF previous_revision IS NULL OR next_revision<>previous_revision+1 THEN
    RAISE EXCEPTION 'production acceptance projection must advance exactly one revision' USING ERRCODE='55000';
   END IF;
  END IF;
  RETURN NEW;
 END`,sourceSha256:'d73341a61fa4f1f011e784521b2ceeb9f93a419e3a80accc087f7501fecc3097'}),
]);

function requiredCriticalDatabaseGuardFunctionSource(name){
 const contract=CRITICAL_DATABASE_GUARD_FUNCTIONS.find(item=>item.name===name);
 if(!contract)throw new Error(`Missing critical database guard function contract: ${name}`);
 return contract.source;
}

for(const contract of CRITICAL_DATABASE_GUARD_FUNCTIONS){
 if(criticalDatabaseGuardFunctionSourceSha256(contract.source)!==contract.sourceSha256)throw new Error(`Critical database guard source contract is invalid: ${contract.name}`);
}

export const CRITICAL_DATABASE_GUARD_TRIGGER_BEHAVIOR=Object.freeze({whenIsNull:true,argumentCount:0,argumentsEmpty:true,oldTransitionTable:null,newTransitionTable:null,constraintOid:0,constraintRelationOid:0,deferrable:false,initiallyDeferred:false,parentTriggerOid:0});

export const CRITICAL_DATABASE_GUARDS=Object.freeze([
 Object.freeze({tableName:'provider_wallet_operations',triggerName:'provider_wallet_contract_immutable',functionName:'reject_provider_wallet_contract_mutation',triggerType:19,updateColumns:Object.freeze(['withdrawal_mode','adapter_contract_sha256'])}),
 Object.freeze({tableName:'game_provider_acceptance_events',triggerName:'game_provider_acceptance_events_immutable',functionName:'guard_game_provider_acceptance_event',triggerType:31,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'game_provider_acceptance_events',triggerName:'game_provider_acceptance_events_no_truncate',functionName:'guard_game_provider_acceptance_event',triggerType:34,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'production_acceptance_events',triggerName:'production_acceptance_events_immutable',functionName:'guard_production_acceptance_event',triggerType:31,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'production_acceptance_events',triggerName:'production_acceptance_events_no_truncate',functionName:'guard_production_acceptance_event',triggerType:34,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'game_provider_acceptance_current',triggerName:'game_provider_acceptance_current_monotonic',functionName:'guard_game_provider_acceptance_current',triggerType:31,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'game_provider_acceptance_current',triggerName:'game_provider_acceptance_current_no_truncate',functionName:'guard_game_provider_acceptance_current',triggerType:34,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'production_acceptance_current',triggerName:'production_acceptance_current_monotonic',functionName:'guard_production_acceptance_current',triggerType:31,updateColumns:Object.freeze([])}),
 Object.freeze({tableName:'production_acceptance_current',triggerName:'production_acceptance_current_no_truncate',functionName:'guard_production_acceptance_current',triggerType:34,updateColumns:Object.freeze([])}),
]);

const normalizeGuardColumns=value=>Array.isArray(value)?value.map(String):typeof value==='string'&&value.startsWith('{')&&value.endsWith('}')?(value.slice(1,-1)?value.slice(1,-1).split(','):[]):[];
const normalizeGuardConfig=value=>Array.isArray(value)?value.map(String):typeof value==='string'&&value.startsWith('{')&&value.endsWith('}')?(value.slice(1,-1)?value.slice(1,-1).split(','):[]):[];
const guardTriggerKey=(tableName,triggerName)=>`${tableName}.${triggerName}`;
const guardFunctionContracts=new Map(CRITICAL_DATABASE_GUARD_FUNCTIONS.map(item=>[item.name,item]));
const guardRowMatches=(row,trigger,schemaName)=>{
 const fn=guardFunctionContracts.get(trigger.functionName),behavior=CRITICAL_DATABASE_GUARD_TRIGGER_BEHAVIOR;
 return !!fn
  &&String(row.table_schema)===schemaName
  &&String(row.table_name)===trigger.tableName
  &&String(row.trigger_name)===trigger.triggerName
  &&String(row.enabled)==='O'
  &&Number(row.trigger_type)===trigger.triggerType
  &&JSON.stringify(normalizeGuardColumns(row.update_columns))===JSON.stringify(trigger.updateColumns)
  &&row.trigger_when_is_null===behavior.whenIsNull
  &&Number(row.trigger_argument_count)===behavior.argumentCount
  &&row.trigger_arguments_empty===behavior.argumentsEmpty
  &&row.old_transition_table===behavior.oldTransitionTable
  &&row.new_transition_table===behavior.newTransitionTable
  &&Number(row.constraint_oid)===behavior.constraintOid
  &&Number(row.constraint_relation_oid)===behavior.constraintRelationOid
  &&row.trigger_deferrable===behavior.deferrable
  &&row.trigger_initially_deferred===behavior.initiallyDeferred
  &&Number(row.parent_trigger_oid)===behavior.parentTriggerOid
  &&String(row.function_schema)===schemaName
  &&String(row.function_name)===fn.name
  &&String(row.function_identity_arguments)===fn.identityArguments
  &&String(row.function_language)===fn.language
  &&String(row.function_return_type)===fn.returnType
  &&String(row.function_kind)===fn.kind
  &&String(row.function_volatility)===fn.volatility
  &&String(row.function_parallel_safety)===fn.parallelSafety
  &&row.function_security_definer===fn.securityDefiner
  &&row.function_leakproof===fn.leakproof
  &&row.function_strict===fn.strict
  &&row.function_returns_set===fn.returnsSet
  &&JSON.stringify(normalizeGuardConfig(row.function_config))===JSON.stringify(fn.config)
  &&criticalDatabaseGuardFunctionSourceSha256(row.function_source)===fn.sourceSha256;
};

export function evaluateCriticalDatabaseGuardRows(rows,{schemaName}={}){
 const source=Array.isArray(rows)?rows:[];
 const observedSchemas=[...new Set(source.map(row=>String(row.table_schema??'')).filter(Boolean))];
 const expectedSchema=typeof schemaName==='string'&&schemaName?schemaName:observedSchemas.length===1?observedSchemas[0]:'';
 const rowsByKey=new Map();
 for(const row of source){const key=guardTriggerKey(String(row.table_name),String(row.trigger_name));rowsByKey.set(key,(rowsByKey.get(key)??[]).concat(row));}
 const invalid=CRITICAL_DATABASE_GUARDS.filter(trigger=>{const matches=rowsByKey.get(guardTriggerKey(trigger.tableName,trigger.triggerName))??[];return matches.length!==1||!guardRowMatches(matches[0],trigger,expectedSchema);}).map(trigger=>guardTriggerKey(trigger.tableName,trigger.triggerName));
 const expectedKeys=new Set(CRITICAL_DATABASE_GUARDS.map(trigger=>guardTriggerKey(trigger.tableName,trigger.triggerName)));
 const unexpected=source.filter(row=>!expectedKeys.has(guardTriggerKey(String(row.table_name),String(row.trigger_name))));
 const functionIdentities=new Set(source.filter(row=>row.function_schema&&row.function_name).map(row=>`${String(row.function_schema)}.${String(row.function_name)}(${String(row.function_identity_arguments)})`));
 const ready=!!expectedSchema&&invalid.length===0&&unexpected.length===0&&source.length===CRITICAL_DATABASE_GUARDS.length&&functionIdentities.size===CRITICAL_DATABASE_GUARD_FUNCTIONS.length;
 return {ready,invalid,unexpected,functionCount:functionIdentities.size,schemaName:expectedSchema};
}

export async function assertCriticalDatabaseGuards(client,{schemaName='public'}={}){
 if(typeof schemaName!=='string'||!/^[a-z_][a-z0-9_]{0,62}$/.test(schemaName))throw new Error('Critical database guard schema is invalid');
 const tableNames=[...new Set(CRITICAL_DATABASE_GUARDS.map(item=>item.tableName))];
 const rows=(await client.query(`SELECT n.nspname table_schema,c.relname table_name,t.tgname trigger_name,t.tgenabled enabled,t.tgtype trigger_type,
  t.tgqual IS NULL trigger_when_is_null,t.tgnargs trigger_argument_count,octet_length(t.tgargs)=0 trigger_arguments_empty,
  t.tgoldtable old_transition_table,t.tgnewtable new_transition_table,t.tgconstraint constraint_oid,t.tgconstrrelid constraint_relation_oid,
  t.tgdeferrable trigger_deferrable,t.tginitdeferred trigger_initially_deferred,t.tgparentid parent_trigger_oid,
  p.proname function_name,pn.nspname function_schema,pg_catalog.pg_get_function_identity_arguments(p.oid) function_identity_arguments,
  l.lanname function_language,pg_catalog.format_type(p.prorettype,NULL) function_return_type,p.prokind function_kind,
  p.provolatile function_volatility,p.proparallel function_parallel_safety,p.prosecdef function_security_definer,
  p.proleakproof function_leakproof,p.proisstrict function_strict,p.proretset function_returns_set,p.proconfig function_config,p.prosrc function_source,
  COALESCE(ARRAY(SELECT a.attname::text FROM unnest(t.tgattr::smallint[]) WITH ORDINALITY position(attnum,ordinality)
   JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=position.attnum ORDER BY position.ordinality),'{}'::text[]) update_columns
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
  JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace
  JOIN pg_catalog.pg_language l ON l.oid=p.prolang
  WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) AND NOT t.tgisinternal
  ORDER BY c.relname,t.tgname`,[schemaName,tableNames])).rows;
 const result=evaluateCriticalDatabaseGuardRows(rows,{schemaName});
 if(!result.ready){
  const details=[...result.invalid,...result.unexpected.map(row=>guardTriggerKey(String(row.table_name),String(row.trigger_name)))].sort();
  throw new Error(`Critical database guard attestation failed (invalid ${result.invalid.length} of ${CRITICAL_DATABASE_GUARDS.length}; unexpected ${result.unexpected.length}; functions ${result.functionCount} of ${CRITICAL_DATABASE_GUARD_FUNCTIONS.length}): ${details.join(',')||'unexpected row or function count'}`);
 }
 return {criticalDatabaseGuardsReady:true,criticalDatabaseGuardCount:CRITICAL_DATABASE_GUARDS.length,criticalDatabaseGuardTables:tableNames.length,criticalDatabaseGuardFunctionCount:CRITICAL_DATABASE_GUARD_FUNCTIONS.length};
}

export const FLEXIBLE_PUBLIC_CONTACTS_MIGRATION='0117-flexible-public-contacts';
async function applyFlexiblePublicContactsMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[FLEXIBLE_PUBLIC_CONTACTS_MIGRATION]);if(applied.rows.length)return false;
 await client.query(`CREATE TABLE IF NOT EXISTS public_contact_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  revision BIGINT NOT NULL UNIQUE CHECK (revision > 0),
  configuration TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at BIGINT NOT NULL CHECK (created_at >= 0)
 );
 CREATE INDEX IF NOT EXISTS public_contact_revisions_created ON public_contact_revisions(revision DESC,created_at DESC);`);
 await client.query(`CREATE OR REPLACE FUNCTION reject_public_contact_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN RAISE EXCEPTION 'contact revision history is immutable'; END $$;
 DROP TRIGGER IF EXISTS public_contact_revisions_no_mutation ON public_contact_revisions;
 CREATE TRIGGER public_contact_revisions_no_mutation BEFORE UPDATE OR DELETE ON public_contact_revisions
 FOR EACH ROW EXECUTE FUNCTION reject_public_contact_revision_mutation();`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[FLEXIBLE_PUBLIC_CONTACTS_MIGRATION]);return true;
}

export const PRODUCTION_ACCEPTANCE_EVIDENCE_MIGRATION='0118-production-acceptance-evidence';
async function applyProductionAcceptanceEvidenceMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[PRODUCTION_ACCEPTANCE_EVIDENCE_MIGRATION]);if(applied.rows.length)return false;
 await client.query(`CREATE TABLE IF NOT EXISTS production_acceptance_events (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('domain','credential','payment','signoff')),
  subject_id TEXT NOT NULL CHECK (length(subject_id) BETWEEN 1 AND 128),
  capability TEXT NOT NULL CHECK (length(capability) BETWEEN 2 AND 64),
  environment TEXT NOT NULL CHECK (environment IN ('uat','production')),
  revision INTEGER NOT NULL CHECK (revision > 0),
  result TEXT NOT NULL CHECK (result IN ('passed','failed','revoked')),
  evidence_sha256 TEXT NOT NULL CHECK (length(evidence_sha256) = 64),
  evidence_reference TEXT NOT NULL CHECK (length(evidence_reference) BETWEEN 1 AND 200),
  verified_by TEXT NOT NULL REFERENCES users(id),
  observed_at BIGINT NOT NULL CHECK (observed_at >= 0),
  recorded_at BIGINT NOT NULL CHECK (recorded_at >= 0),
  UNIQUE(id,category,subject_id,capability,environment),
  UNIQUE(category,subject_id,capability,environment,revision)
 );
 CREATE INDEX IF NOT EXISTS production_acceptance_events_subject ON production_acceptance_events(category,subject_id,environment,capability,recorded_at DESC,id DESC);
 CREATE TABLE IF NOT EXISTS production_acceptance_current (
  category TEXT NOT NULL CHECK (category IN ('domain','credential','payment','signoff')),
  subject_id TEXT NOT NULL CHECK (length(subject_id) BETWEEN 1 AND 128),
  capability TEXT NOT NULL CHECK (length(capability) BETWEEN 2 AND 64),
  environment TEXT NOT NULL CHECK (environment IN ('uat','production')),
  event_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY(category,subject_id,capability,environment),
  FOREIGN KEY(event_id,category,subject_id,capability,environment) REFERENCES production_acceptance_events(id,category,subject_id,capability,environment)
 );
 CREATE INDEX IF NOT EXISTS production_acceptance_current_environment ON production_acceptance_current(environment,category,subject_id,capability);`);
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[PRODUCTION_ACCEPTANCE_EVIDENCE_MIGRATION]);return true;
}

export const WITHDRAWAL_DESTINATION_METHODS_MIGRATION='0119-withdrawal-destination-methods';
async function applyWithdrawalDestinationMethodsMigration(client){
 const applied=await client.query('SELECT version FROM portal_schema_migrations WHERE version=$1',[WITHDRAWAL_DESTINATION_METHODS_MIGRATION]);if(applied.rows.length)return false;
 await client.query("ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS destination_type TEXT NOT NULL DEFAULT 'bank' CHECK(destination_type IN ('bank','ewallet'))");
 await client.query('ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS ewallet_code TEXT');
 await client.query('ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS ewallet_name TEXT');
 await client.query('ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS ewallet_account_encrypted TEXT');
 await client.query('ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS ewallet_account_last4 TEXT');
 await client.query("INSERT INTO portal_schema_migrations(version,applied_at) VALUES($1,CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT))",[WITHDRAWAL_DESTINATION_METHODS_MIGRATION]);return true;
}

export async function initializePortalDatabase(pool, schema, directoryEntries, options = {}) {
  const client = await pool.connect();
  try {
    const expectedSchema=options.expectedSchema??'public';
    if(typeof expectedSchema!=='string'||!/^[a-z_][a-z0-9_]{0,62}$/.test(expectedSchema))throw new Error('Portal database schema is invalid');
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [PORTAL_MIGRATION_ADVISORY_LOCK]);
    await client.query("SELECT pg_catalog.set_config('search_path',$1,true)", [`${expectedSchema}, pg_catalog, pg_temp`]);
    await client.query("SELECT 1");
    await client.query(schema);
    const migrated = await applyStatusMigration(client);
    const connectedServicesOpened = await applyConnectedServicesMigration(client);
    await applyPaymentProvidersMigration(client, options);
    await applyManualBankMigration(client);
    await applyApiSupplierStatusMigration(client);
    await applyGameAccessZoneMigration(client);
    await applyMarketingContactScaleMigration(client);
    await applyOperationsAutomationMigration(client);
    await applySupportMarketingMigration(client);
    await applyWhatsAppCampaignDeliveryMigration(client);
    await applyRewardsHubMigration(client);
    await applyResponsiblePlayMigration(client);
    await applyManualComplianceMigration(client);
    await applyGSPayUsdtProfileMigration(client);
    await applyGameProviderAdapterCoreMigration(client);
    await applyMegaH5LaunchOperationsMigration(client);
    await applyGameProviderAcceptanceMigration(client);
    await applyGenericGameWalletRiskMigration(client);
    await applyCompanyBankArtworkMigration(client);
    await applyNewMemberVoucherMigration(client);
    await applyVoucherManualWorkflowMigration(client);
    await applyFixedVoucherRetirementMigration(client);
    await applyBenefitClaimReviewMigration(client);
    await applyPayoutControlMigration(client);
    await applyPaymentAcceptanceGuard(client);
    await applyExplicitPaymentChannelActivations(client, options);
    await applyGSPayPayoutActivation(client, options);
    await applyManualBankFundsMigration(client);
    await applyProviderWalletOperationsMigration(client);
    await applyFlexiblePublicContactsMigration(client);
    await applyProductionAcceptanceEvidenceMigration(client);
    await applyWithdrawalDestinationMethodsMigration(client);
    await applyProviderWalletSweepsMigration(client);
    await applyJdbWagerCoverageStagingMigration(client);
    await applyAcceptanceLedgerIntegrityMigration(client);
    await applyGuardFunctionSchemaBindingMigration(client,expectedSchema);
    await applyManualBankAuditEvidenceIndexMigration(client);
    await applyPrivilegedStaffPasswordBoundaryMigration(client);
    const criticalDatabaseGuards = await assertCriticalDatabaseGuards(client,{schemaName:expectedSchema});
    const rows = seedRows(directoryEntries);
    await client.query(
      `INSERT INTO brand_directory_entries(id,category,display_name,position,marked,status,image_data,updated_at)
       SELECT id,category,display_name,position,marked,'closed','',0
       FROM jsonb_to_recordset($1::jsonb) AS entry(id TEXT,category TEXT,display_name TEXT,position INTEGER,marked BOOLEAN)
       ON CONFLICT(id) DO NOTHING`,
      [JSON.stringify(rows)],
    );
    await client.query("COMMIT");
    return { migrated, connectedServicesOpened, seededBrandCount: rows.length, ...criticalDatabaseGuards };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
