# Supabase migration history

Production's `supabase_migrations.schema_migrations` bookkeeping was missing entirely before migration `013`: migrations `001`-`012` had all actually been applied (they were run by hand through the Supabase SQL Editor at some point), but the CLI's history table never recorded any of them as `applied`. `supabase migration list` showed every one of them with an empty `remote` column, and `supabase db push` planned to replay `001` through `013` in order - not just the new one.

Replaying old migrations blind is not safe here: several of them (`create policy`, for example) aren't idempotent in Postgres, so a raw `db push` in that state would likely have errored or duplicated objects.

Before trusting `supabase migration repair --status applied <versions>` to fix the bookkeeping, verify the versions you're about to mark actually match production - `supabase migration list` disagreeing with what you know to be deployed is not proof either way. Run `supabase db query --linked` (no Docker required, unlike `db diff`/`db pull`) against `information_schema.columns`, `pg_constraint`, `pg_policies`, and `pg_proc` for the tables/policies/functions those migrations are supposed to create, and diff that by hand against the migration files. Only once the live schema and the migration files agree, repair the matching versions to `applied` and push the rest.
