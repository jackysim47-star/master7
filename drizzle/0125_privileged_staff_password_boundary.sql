DELETE FROM password_sessions
WHERE user_id IN (
  SELECT c.user_id
  FROM password_credentials c
  JOIN users u ON u.id=c.user_id
  LEFT JOIN settings ready
    ON ready.id='staff_password_ready:'||c.user_id
   AND ready.value=CAST(c.version AS TEXT)
  LEFT JOIN settings pending
    ON pending.id='staff_password_setup:'||c.user_id
   AND json_valid(pending.value)
   AND json_extract(pending.value,'$.userId')=c.user_id
   AND json_extract(pending.value,'$.credentialVersion')=c.version
   AND length(json_extract(pending.value,'$.tokenHash'))=64
  WHERE u.role='staff'
    AND u.id<>'system-support-assistant'
    AND ready.id IS NULL
    AND pending.id IS NULL
);

DELETE FROM settings
WHERE id IN (
  SELECT 'staff_password_ready:'||c.user_id
  FROM password_credentials c
  JOIN users u ON u.id=c.user_id
  LEFT JOIN settings ready
    ON ready.id='staff_password_ready:'||c.user_id
   AND ready.value=CAST(c.version AS TEXT)
  LEFT JOIN settings pending
    ON pending.id='staff_password_setup:'||c.user_id
   AND json_valid(pending.value)
   AND json_extract(pending.value,'$.userId')=c.user_id
   AND json_extract(pending.value,'$.credentialVersion')=c.version
   AND length(json_extract(pending.value,'$.tokenHash'))=64
  WHERE u.role='staff'
    AND u.id<>'system-support-assistant'
    AND ready.id IS NULL
    AND pending.id IS NULL
  UNION ALL
  SELECT 'staff_password_setup:'||c.user_id
  FROM password_credentials c
  JOIN users u ON u.id=c.user_id
  LEFT JOIN settings ready
    ON ready.id='staff_password_ready:'||c.user_id
   AND ready.value=CAST(c.version AS TEXT)
  LEFT JOIN settings pending
    ON pending.id='staff_password_setup:'||c.user_id
   AND json_valid(pending.value)
   AND json_extract(pending.value,'$.userId')=c.user_id
   AND json_extract(pending.value,'$.credentialVersion')=c.version
   AND length(json_extract(pending.value,'$.tokenHash'))=64
  WHERE u.role='staff'
    AND u.id<>'system-support-assistant'
    AND ready.id IS NULL
    AND pending.id IS NULL
);

UPDATE password_credentials
SET salt=lower(hex(randomblob(32))),
    password_hash=lower(hex(randomblob(32))),
    version=version+1,
    changed_at=unixepoch()
WHERE user_id IN (
  SELECT c.user_id
  FROM password_credentials c
  JOIN users u ON u.id=c.user_id
  LEFT JOIN settings ready
    ON ready.id='staff_password_ready:'||c.user_id
   AND ready.value=CAST(c.version AS TEXT)
  LEFT JOIN settings pending
    ON pending.id='staff_password_setup:'||c.user_id
   AND json_valid(pending.value)
   AND json_extract(pending.value,'$.userId')=c.user_id
   AND json_extract(pending.value,'$.credentialVersion')=c.version
   AND length(json_extract(pending.value,'$.tokenHash'))=64
  WHERE u.role='staff'
    AND u.id<>'system-support-assistant'
    AND ready.id IS NULL
    AND pending.id IS NULL
);

INSERT OR IGNORE INTO audit(id,user_id,event,target,created_at)
SELECT 'staff-boundary-migration:'||c.user_id,
       c.user_id,
       'legacy_staff_password_disabled',
       'account',
       unixepoch()
FROM password_credentials c
JOIN users u ON u.id=c.user_id
LEFT JOIN settings ready
  ON ready.id='staff_password_ready:'||c.user_id
 AND ready.value=CAST(c.version AS TEXT)
LEFT JOIN settings pending
  ON pending.id='staff_password_setup:'||c.user_id
 AND json_valid(pending.value)
 AND json_extract(pending.value,'$.userId')=c.user_id
 AND json_extract(pending.value,'$.credentialVersion')=c.version
 AND length(json_extract(pending.value,'$.tokenHash'))=64
WHERE u.role='staff'
  AND u.id<>'system-support-assistant'
  AND ready.id IS NULL
  AND pending.id IS NULL;

INSERT INTO settings(id,value)
SELECT 'staff_password_setup:'||c.user_id,
       json_object(
         'userId',c.user_id,
         'tokenHash',lower(hex(randomblob(32))),
         'credentialVersion',c.version,
         'issuedAt',unixepoch()-7200,
         'expiresAt',unixepoch()-3600
       )
FROM password_credentials c
JOIN users u ON u.id=c.user_id
LEFT JOIN settings ready
  ON ready.id='staff_password_ready:'||c.user_id
 AND ready.value=CAST(c.version AS TEXT)
LEFT JOIN settings pending
  ON pending.id='staff_password_setup:'||c.user_id
 AND json_valid(pending.value)
 AND json_extract(pending.value,'$.userId')=c.user_id
 AND json_extract(pending.value,'$.credentialVersion')=c.version
 AND length(json_extract(pending.value,'$.tokenHash'))=64
WHERE u.role='staff'
  AND u.id<>'system-support-assistant'
  AND ready.id IS NULL
  AND pending.id IS NULL
ON CONFLICT(id) DO UPDATE SET value=excluded.value;
