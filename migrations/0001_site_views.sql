CREATE TABLE IF NOT EXISTS site_views (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);

INSERT OR IGNORE INTO site_views (id, total) VALUES (1, 0);
