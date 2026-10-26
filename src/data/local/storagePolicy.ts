// An already-running v1 native client must not replace a migrated root with v1.
// Keep the original keys so product rows and metadata migrate in one transaction.
export const SCHEMA_GUARD_SQL = `
CREATE TRIGGER IF NOT EXISTS library_schema_insert BEFORE INSERT ON kv
WHEN NEW.key GLOB 'library:*:v1'
BEGIN
 SELECT CASE WHEN
   (SELECT json_extract(value, '$.version') FROM kv WHERE key = NEW.key) >= 2
   AND COALESCE(CASE WHEN json_valid(NEW.value) THEN json_extract(NEW.value, '$.version') END, 0)
     < (SELECT json_extract(value, '$.version') FROM kv WHERE key = NEW.key)
 THEN RAISE(ABORT, 'unsupported_library_downgrade') END;
END;
CREATE TRIGGER IF NOT EXISTS library_schema_update BEFORE UPDATE ON kv
WHEN OLD.key GLOB 'library:*:v1'
BEGIN
 SELECT CASE WHEN json_extract(OLD.value, '$.version') >= 2
   AND COALESCE(CASE WHEN json_valid(NEW.value) THEN json_extract(NEW.value, '$.version') END, 0)
     < json_extract(OLD.value, '$.version')
 THEN RAISE(ABORT, 'unsupported_library_downgrade') END;
END;
`;
