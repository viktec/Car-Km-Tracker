-- Store trip distances as REAL so route calculations preserve decimal kilometres.
CREATE TABLE IF NOT EXISTS trips_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  km REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

INSERT INTO trips_v2 (id, contract_id, date, category, km, note, created_at)
SELECT id, contract_id, date, category, km, note, created_at
FROM trips;

DROP TABLE trips;
ALTER TABLE trips_v2 RENAME TO trips;
