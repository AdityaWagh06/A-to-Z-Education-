-- ==============================================================================
-- Supabase Migration: Enable Row Level Security (RLS) & Secure Policies
-- Fixes: "RLS Disabled in Public Entity: public.users Schema: public"
-- ==============================================================================

-- 1. Enable RLS on all public tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paid_standard_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paid_standard_box_tests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;

DROP POLICY IF EXISTS "Public can view active videos" ON public.videos;
DROP POLICY IF EXISTS "Service role full access on videos" ON public.videos;

DROP POLICY IF EXISTS "Public can view tests metadata" ON public.tests;
DROP POLICY IF EXISTS "Service role full access on tests" ON public.tests;

DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Service role full access on announcements" ON public.announcements;

DROP POLICY IF EXISTS "Public can view standards" ON public.standards;
DROP POLICY IF EXISTS "Service role full access on standards" ON public.standards;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;

DROP POLICY IF EXISTS "Public can view paid boxes" ON public.paid_standard_boxes;
DROP POLICY IF EXISTS "Service role full access on paid boxes" ON public.paid_standard_boxes;

-- 3. POLICIES FOR USERS TABLE (User-Private + Service Role)
-- Logged in user can only read their own profile row
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()) OR email = (SELECT auth.jwt() ->> 'email'));

-- Logged in user can only update their own profile row
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()) OR email = (SELECT auth.jwt() ->> 'email'))
WITH CHECK (id = (SELECT auth.uid()) OR email = (SELECT auth.jwt() ->> 'email'));

-- Backend server (service_role) has full control for logins and admin management
CREATE POLICY "Service role full access on users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. POLICIES FOR VIDEOS TABLE (Public Read, Backend Write)
CREATE POLICY "Public can view active videos"
ON public.videos
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full access on videos"
ON public.videos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. POLICIES FOR TESTS TABLE (Public Metadata Read, Backend Write)
CREATE POLICY "Public can view tests metadata"
ON public.tests
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full access on tests"
ON public.tests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. POLICIES FOR ANNOUNCEMENTS & STANDARDS
CREATE POLICY "Public can view announcements"
ON public.announcements
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full access on announcements"
ON public.announcements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view standards"
ON public.standards
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full access on standards"
ON public.standards
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. POLICIES FOR PAYMENTS TABLE (Private)
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access on payments"
ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8. POLICIES FOR PAID STANDARD BOXES
CREATE POLICY "Public can view paid boxes"
ON public.paid_standard_boxes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Service role full access on paid boxes"
ON public.paid_standard_boxes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 9. Minimal privileges for anon role on sensitive tables
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.payments FROM anon;
