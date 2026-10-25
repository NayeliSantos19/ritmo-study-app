CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  weekly_goal INTEGER NOT NULL DEFAULT 300 CHECK (weekly_goal BETWEEN 1 AND 10080),
  created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tema TEXT NOT NULL CHECK (length(tema) BETWEEN 1 AND 120),
  materia TEXT NOT NULL CHECK (length(materia) BETWEEN 1 AND 60),
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  minutos INTEGER NOT NULL CHECK (minutos BETWEEN 1 AND 1440),
  notas TEXT NOT NULL CHECK (length(notas) <= 1000),
  estado TEXT NOT NULL CHECK (estado IN ('planned', 'completed')),
  PRIMARY KEY (user_id, id)
) STRICT;
CREATE INDEX IF NOT EXISTS sessions_by_user_date ON sessions(user_id, fecha, hora);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS auth_by_expiry ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
