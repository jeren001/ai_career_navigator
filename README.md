# AI Career Navigator

AI-powered career guidance project.

## Backend and local PostgreSQL

The Express API lives in `backend`. It reads `DATABASE_URL` from `backend/.env` and exposes active career roles at `GET /api/careers`. Optional query parameters are `cluster`, `category`, and `niche_pivot_friendly=true|false`. `cluster` filters `career_roles.cluster`. `category` filters the `career_field` metadata in `market_pulse`. The response uses the database column names, including `slug`, `title`, `cluster`, `summary`, and `is_active`.

PostgreSQL must be installed and running locally. First inspect existing databases and tables so you can reuse the intended database without disturbing existing data:

```sh
psql -l
```

If `career_compass` does not exist, create it. `createdb` will fail safely if that database name is already taken:

```sh
createdb career_compass
```

Apply the schema and career seed from `backend/database/` to the intended database. Review both scripts before running them against a database with existing tables. The schema creates the project tables, and the seed adds the career catalog while preserving existing role IDs and catalog edits:

```sh
psql -d career_compass -v ON_ERROR_STOP=1 -f backend/database/schema.sql
psql -d career_compass -v ON_ERROR_STOP=1 -f backend/database/seed.sql
```

Copy the sample environment file only if `backend/.env` does not already exist, then set its `DATABASE_URL` to match your local PostgreSQL credentials:

```sh
cp -n backend/.env.example backend/.env
```

For a local role named `postgres` with no password, the sample URL is `postgresql://postgres@localhost:5432/career_compass`. Start the API and run its tests from `backend`:

```sh
npm start
npm test
```

Verify the seeded data with:

```sh
psql -d career_compass -c "SELECT count(*) AS active_careers, count(DISTINCT cluster) AS clusters FROM career_roles WHERE is_active = TRUE;"
```
