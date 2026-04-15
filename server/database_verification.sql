/**
 * Database Schema Verification Script
 * Run this in Supabase SQL Editor to verify all required columns exist
 * 
 * This script checks:
 * 1. Users table columns
 * 2. Videos table columns
 * 3. Tests table columns
 * 4. Announcements table columns
 * 5. Payments table columns
 * 6. Paid Standard Boxes table and relationships
 * 
 * It returns a detailed report of what exists and what's missing
 */

-- Users Table Verification
DO $$
DECLARE
    required_columns text[] := ARRAY[
        'id', 'name', 'email', 'google_id', 'role', 'standard',
        'progress', 'purchased_tests', 'purchased_standard_boxes',
        'mobile_no', 'picture', 'last_login_at', 'created_at', 'updated_at'
    ];
    missing_columns text[] := ARRAY[]::text[];
    col text;
BEGIN
    FOREACH col IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Users table - MISSING COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'Users table - OK: All % columns present', array_length(required_columns, 1);
    END IF;
END $$;

-- Videos Table Verification
DO $$
DECLARE
    required_columns text[] := ARRAY[
        'id', 'title', 'youtube_url', 'thumbnail', 'subject',
        'standard', 'duration', 'created_at'
    ];
    missing_columns text[] := ARRAY[]::text[];
    col text;
BEGIN
    FOREACH col IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'videos' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Videos table - MISSING COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'Videos table - OK: All % columns present', array_length(required_columns, 1);
    END IF;
END $$;

-- Tests Table Verification
DO $$
DECLARE
    required_columns text[] := ARRAY[
        'id', 'title', 'subject', 'standard', 'price', 'questions',
        'time_limit', 'is_locked', 'pdf_path', 'answer_sheet_path', 'created_at'
    ];
    missing_columns text[] := ARRAY[]::text[];
    col text;
BEGIN
    FOREACH col IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tests' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Tests table - MISSING COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'Tests table - OK: All % columns present', array_length(required_columns, 1);
    END IF;
END $$;

-- Announcements Table Verification
DO $$
DECLARE
    required_columns text[] := ARRAY[
        'id', 'title', 'description', 'link', 'active', 'created_at'
    ];
    missing_columns text[] := ARRAY[]::text[];
    col text;
BEGIN
    FOREACH col IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'announcements' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Announcements table - MISSING COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'Announcements table - OK: All % columns present', array_length(required_columns, 1);
    END IF;
END $$;

-- Payments Table Verification
DO $$
DECLARE
    required_columns text[] := ARRAY[
        'id', 'user_id', 'test_id', 'box_id', 'payment_type',
        'standard_value', 'razorpay_order_id', 'razorpay_payment_id',
        'amount', 'status', 'created_at'
    ];
    missing_columns text[] := ARRAY[]::text[];
    col text;
BEGIN
    FOREACH col IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'payments' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Payments table - MISSING COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'Payments table - OK: All % columns present', array_length(required_columns, 1);
    END IF;
END $$;

-- Paid Standard Boxes Verification
DO $$
DECLARE
    required_columns text[] := ARRAY[
        'id', 'standard', 'title', 'description', 'amount', 'is_active', 'created_at'
    ];
    missing_columns text[] := ARRAY[]::text[];
    col text;
BEGIN
    FOREACH col IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'paid_standard_boxes' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Paid Standard Boxes table - MISSING COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'Paid Standard Boxes table - OK: All % columns present', array_length(required_columns, 1);
    END IF;
END $$;

-- Check table existence
SELECT 
    'TABLE EXISTENCE CHECK' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN '✓ users' ELSE '✗ users' END as result
UNION ALL
SELECT 'TABLE EXISTENCE CHECK', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='videos') THEN '✓ videos' ELSE '✗ videos' END
UNION ALL
SELECT 'TABLE EXISTENCE CHECK', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tests') THEN '✓ tests' ELSE '✗ tests' END
UNION ALL
SELECT 'TABLE EXISTENCE CHECK', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='announcements') THEN '✓ announcements' ELSE '✗ announcements' END
UNION ALL
SELECT 'TABLE EXISTENCE CHECK', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN '✓ payments' ELSE '✗ payments' END
UNION ALL
SELECT 'TABLE EXISTENCE CHECK', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='paid_standard_boxes') THEN '✓ paid_standard_boxes' ELSE '✗ paid_standard_boxes' END
UNION ALL
SELECT 'TABLE EXISTENCE CHECK', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='paid_standard_box_tests') THEN '✓ paid_standard_box_tests' ELSE '✗ paid_standard_box_tests' END;

-- Summary Report
SELECT 
    'SUMMARY' as report_type,
    count(*) as total_tables
FROM information_schema.tables 
WHERE table_name IN ('users', 'videos', 'tests', 'announcements', 'payments', 'paid_standard_boxes', 'paid_standard_box_tests');
