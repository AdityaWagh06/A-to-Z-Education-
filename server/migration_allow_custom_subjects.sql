-- Allow custom subject keys for videos/tests managed from admin panel
-- Run this in Supabase SQL editor (or your migration runner).

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Drop existing subject check constraints on videos table
    FOR rec IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid
        WHERE rel.relname = 'videos'
          AND att.attname = 'subject'
          AND att.attnum = ANY (con.conkey)
          AND con.contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE videos DROP CONSTRAINT IF EXISTS %I', rec.conname);
    END LOOP;

    -- Drop existing subject check constraints on tests table
    FOR rec IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid
        WHERE rel.relname = 'tests'
          AND att.attname = 'subject'
          AND att.attnum = ANY (con.conkey)
          AND con.contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE tests DROP CONSTRAINT IF EXISTS %I', rec.conname);
    END LOOP;
END $$;

-- Optional safety checks to keep subject values meaningful (not empty)
ALTER TABLE videos
    ADD CONSTRAINT videos_subject_not_empty CHECK (char_length(trim(subject)) > 0);

ALTER TABLE tests
    ADD CONSTRAINT tests_subject_not_empty CHECK (char_length(trim(subject)) > 0);
