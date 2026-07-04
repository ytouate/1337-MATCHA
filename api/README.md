# Matcha API

FastAPI backend for the Matcha dating application.

## Database compliance (NFR-32 to NFR-35)

| NFR    | Requirement              | Implementation                                             |
| ------ | ------------------------ | ---------------------------------------------------------- |
| NFR-32 | Relational or graph DB   | **PostgreSQL 16** (`postgres:16` in `docker-compose.yaml`) |
| NFR-33 | Free database            | Open-source PostgreSQL running locally in Docker           |
| NFR-34 | Manually created queries | **psycopg3** with hand-written parameterized SQL — no ORM  |
| NFR-35 | ≥500 evaluation profiles | `seed_profiles.py` seeds 500 complete browsable profiles   |

### Query layer

- Connection: `src/db/database.py` (`PgDatabase` context manager)
- Schema bootstrap: JSON models in `src/models/` → `create_tables.py`
- Business logic: raw SQL in `src/services/*.py`

Representative manual SQL examples:

- Auth inserts/selects: `src/services/auth_service.py`
- Suggestion ranking with haversine distance: `src/services/suggestion_service.py`
- Social graph operations: `src/services/social_service.py`

There is **no SQLAlchemy, Alembic, or other ORM** in `pyproject.toml`.

## Getting started

```bash
cp env_sample .env
# Fill in POSTGRES_*, JWT_SECRET_KEY (≥32 chars), MINIO_*, etc.

make backend
make create-tables
make seed-interests
make seed-profiles
make verify-seed
```

Or run the full evaluation seed in one command:

```bash
make seed-eval
```

## Evaluation seed (NFR-35)

The seed creates **500 complete profiles** (`seeduser001` … `seeduser500`) with:

- Verified email and completed profile flags
- Gender / preference pairs compatible with browse filters
- Bio, Paris-area coordinates, fame rating, interests, and a placeholder profile image path

Shared credentials for manual testing:

- **Username:** `seeduser001`
- **Password:** `SeedPassword123!`

Re-seed from scratch:

```bash
make seed-profiles-force
```

Verify profile count:

```bash
make verify-seed
```

Inside Postgres:

```sql
SELECT COUNT(*) FROM users WHERE is_profile_completed = true;
```

## Makefile targets

| Target                     | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `make backend`             | Start Docker Compose stack                           |
| `make create-tables`       | Create tables from JSON models                       |
| `make migrate`             | Apply incremental SQL migrations to an existing DB   |
| `make seed-interests`      | Insert default interest tags                         |
| `make seed-profiles`       | Insert 500 evaluation profiles (idempotent)          |
| `make seed-profiles-force` | Delete and re-insert seed profiles                   |
| `make seed-eval`           | `create-tables` + `seed-interests` + `seed-profiles` |
| `make verify-seed`         | Assert ≥500 complete seed profiles exist             |
| `make test`                | Run pytest suite                                     |
| `make psql`                | Open Postgres shell                                  |

## Migrations

Incremental SQL files live in `migrations/`. `make create-tables` applies them automatically on fresh installs. For an existing database:

```bash
make migrate
```
