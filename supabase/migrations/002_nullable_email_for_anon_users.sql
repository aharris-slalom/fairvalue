-- Allow anonymous sign-ins.
-- The handle_new_user trigger inserts into public.users on every auth.users row,
-- including anonymous users which have no email. Dropping NOT NULL lets the
-- trigger succeed; the UNIQUE constraint still holds for non-null values.
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
