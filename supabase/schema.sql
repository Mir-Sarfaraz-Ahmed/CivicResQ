-- Phase 1: Supabase Setup & Schema Definition

-- Create Roles Enum
CREATE TYPE app_role AS ENUM ('CITIZEN', 'NGO', 'GROUND_TEAM', 'OPERATIONS', 'ADMIN');
CREATE TYPE org_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE urgency_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE request_status AS ENUM ('UNDER_REVIEW', 'MATCHED', 'DISPATCHED', 'DELIVERED', 'RESOLVED');
CREATE TYPE resource_status AS ENUM ('AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'DELIVERED', 'EXPIRED');
CREATE TYPE dispatch_status AS ENUM ('RECOMMENDED', 'AWAITING_APPROVAL', 'APPROVED', 'ASSIGNED', 'PICKING_UP', 'IN_TRANSIT', 'DELIVERED');

-- Organizations Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status org_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table (Extends auth.users securely)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role DEFAULT 'CITIZEN' NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Requests
CREATE TABLE emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by UUID REFERENCES profiles(id) NOT NULL,
    description TEXT NOT NULL,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    people_affected INT DEFAULT 1,
    urgency urgency_level DEFAULT 'MEDIUM',
    category TEXT,
    priority_score FLOAT8 DEFAULT 0.0,
    status request_status DEFAULT 'UNDER_REVIEW',
    contact_method TEXT,
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request Items (Demands)
CREATE TABLE request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES emergency_requests(id) ON DELETE CASCADE NOT NULL,
    resource_type TEXT NOT NULL,
    quantity_required INT NOT NULL,
    quantity_fulfilled INT DEFAULT 0
);

-- Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    type TEXT NOT NULL,
    quantity INT NOT NULL,
    unit TEXT NOT NULL,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    status resource_status DEFAULT 'AVAILABLE',
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    type TEXT NOT NULL,
    capacity INT NOT NULL,
    current_lat FLOAT8 NOT NULL,
    current_lng FLOAT8 NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shelters Table
CREATE TABLE shelters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    capacity INT NOT NULL,
    available_capacity INT NOT NULL,
    food_available BOOLEAN DEFAULT FALSE,
    water_available BOOLEAN DEFAULT FALSE,
    medical_available BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatches (The Logistics Core)
CREATE TABLE dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES emergency_requests(id) NOT NULL,
    resource_id UUID REFERENCES resources(id) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
    ground_team_id UUID REFERENCES profiles(id),
    status dispatch_status DEFAULT 'RECOMMENDED',
    eta_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Row Level Security (RLS) Implementation
-- -------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Utility Function to get current user's role securely
CREATE OR REPLACE FUNCTION get_my_role() RETURNS app_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Utility Function to get current user's organization securely
CREATE OR REPLACE FUNCTION get_my_org() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can do all to profiles" ON profiles FOR ALL USING (get_my_role() = 'ADMIN');

-- ORGANIZATIONS POLICIES
CREATE POLICY "NGOs can view own organization" ON organizations FOR SELECT USING (
    get_my_role() = 'NGO' AND id = get_my_org()
);
CREATE POLICY "Ops and Admins can view all organizations" ON organizations FOR SELECT USING (
    get_my_role() IN ('OPERATIONS', 'ADMIN')
);
CREATE POLICY "Admin can manage all organizations" ON organizations FOR ALL USING (
    get_my_role() = 'ADMIN'
);

-- EMERGENCY REQUESTS POLICIES
CREATE POLICY "Citizens can insert own requests" ON emergency_requests FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Citizens can view own requests" ON emergency_requests FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "Ops and Admins can view all requests" ON emergency_requests FOR SELECT USING (get_my_role() IN ('OPERATIONS', 'ADMIN'));
CREATE POLICY "Ops and Admins can update requests" ON emergency_requests FOR UPDATE USING (get_my_role() IN ('OPERATIONS', 'ADMIN'));

-- REQUEST ITEMS POLICIES
CREATE POLICY "Citizens can insert items for own requests" ON request_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM emergency_requests WHERE id = request_id AND reported_by = auth.uid())
);
CREATE POLICY "Citizens can view own request items" ON request_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM emergency_requests WHERE id = request_id AND reported_by = auth.uid())
);
CREATE POLICY "Ops/NGO/Admin/Ground can view all request items" ON request_items FOR SELECT USING (
    get_my_role() IN ('OPERATIONS', 'NGO', 'ADMIN', 'GROUND_TEAM')
);
CREATE POLICY "Ops and Admins can update request items" ON request_items FOR UPDATE USING (
    get_my_role() IN ('OPERATIONS', 'ADMIN')
);

-- RESOURCES POLICIES
CREATE POLICY "NGOs can manage own resources" ON resources FOR ALL USING (
    get_my_role() = 'NGO' AND organization_id = get_my_org()
);
CREATE POLICY "Global View for Routing" ON resources FOR SELECT USING (
    get_my_role() IN ('OPERATIONS', 'ADMIN', 'GROUND_TEAM')
);

-- VEHICLES POLICIES
CREATE POLICY "NGOs can manage own vehicles" ON vehicles FOR ALL USING (
    get_my_role() = 'NGO' AND organization_id = get_my_org()
);
CREATE POLICY "Ops and Admins can view all vehicles" ON vehicles FOR SELECT USING (
    get_my_role() IN ('OPERATIONS', 'ADMIN')
);

-- SHELTERS POLICIES
CREATE POLICY "Anyone authenticated can view shelters" ON shelters FOR SELECT USING (
    auth.role() = 'authenticated'
);
CREATE POLICY "Admin and Ops can manage shelters" ON shelters FOR ALL USING (
    get_my_role() IN ('OPERATIONS', 'ADMIN')
);

-- DISPATCHES POLICIES
CREATE POLICY "Ground team views own tasks" ON dispatches FOR SELECT USING (auth.uid() = ground_team_id);
CREATE POLICY "Ground team updates own tasks" ON dispatches FOR UPDATE USING (auth.uid() = ground_team_id);
CREATE POLICY "Ops/Admin manage dispatches" ON dispatches FOR ALL USING (get_my_role() IN ('OPERATIONS', 'ADMIN'));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT USING (
    get_my_role() = 'ADMIN'
);
CREATE POLICY "Users can view own action audit logs" ON audit_logs FOR SELECT USING (
    auth.uid() = user_id
);
CREATE POLICY "Anyone authenticated can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- -------------------------------------------------------------
-- Triggers & Automatic Profile Initialization
-- -------------------------------------------------------------

-- Trigger to create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role app_role := 'CITIZEN';
BEGIN
  IF NEW.email IN ('admin@civicresq.com', 'admin@gmail.com') THEN
    assigned_role := 'ADMIN';
  ELSIF NEW.raw_user_meta_data->>'role' = 'NGO' THEN
    assigned_role := 'NGO';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role, organization_id, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    assigned_role,
    NULL,
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to protect sensitive columns on profile updates
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
DECLARE
  calling_user_role app_role;
BEGIN
  -- Check if we are bypassing the trigger (e.g. from secure database functions)
  IF current_setting('app.bypass_profile_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- If this is an API call (auth.uid() is not null)
  IF auth.uid() IS NOT NULL THEN
    -- ROOT ADMIN PROTECTION: Block any modification of the root admin's profile
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = OLD.id AND email IN ('admin@civicresq.com', 'admin@gmail.com')
    ) AND (
      OLD.role IS DISTINCT FROM NEW.role OR
      OLD.is_active IS DISTINCT FROM NEW.is_active OR
      OLD.organization_id IS DISTINCT FROM NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Access Denied: The root administrator account is immutable and cannot be modified.';
    END IF;

    -- Get calling user's role
    SELECT role FROM public.profiles WHERE id = auth.uid() INTO calling_user_role;

    -- If the role, organization_id, or is_active is changing, and the calling user is NOT an ADMIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR 
        OLD.organization_id IS DISTINCT FROM NEW.organization_id OR
        OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
      IF (calling_user_role IS NULL OR calling_user_role <> 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can modify roles, organization assignments, or active status.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER before_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_columns();

-- -------------------------------------------------------------
-- Secure Admin & NGO Management RPCs (Server-side Only)
-- -------------------------------------------------------------

-- Secure user list for Admin panel: joins profiles with auth.users to expose email
-- auth.users is not accessible via PostgREST; SECURITY DEFINER grants server-level access
CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  is_active BOOLEAN,
  organization_id UUID,
  org_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only ADMIN may call this function
  IF get_my_role() <> 'ADMIN' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can list all users.';
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      u.email,
      p.full_name,
      p.phone,
      p.role::TEXT,
      p.is_active,
      p.organization_id,
      o.name AS org_name,
      p.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.organizations o ON o.id = p.organization_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Secure bootstrapping of the first Admin user
CREATE OR REPLACE FUNCTION setup_initial_admin(setup_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expected_secret TEXT := current_setting('app.admin_setup_secret', true);
BEGIN
    -- Prevent overwriting existing admins if one already exists (Requirement 6)
    IF EXISTS (SELECT 1 FROM profiles WHERE role = 'ADMIN') THEN
        RAISE EXCEPTION 'Admin already initialized.';
    END IF;

    IF setup_secret = expected_secret THEN
        -- Temporarily bypass the before_profile_update trigger
        PERFORM set_config('app.bypass_profile_trigger', 'true', true);

        UPDATE profiles SET role = 'ADMIN' WHERE id = auth.uid();
        
        PERFORM set_config('app.bypass_profile_trigger', 'false', true);

        -- Log in audit logs (Requirement 8)
        INSERT INTO public.audit_logs (user_id, action, target_type, target_id)
        VALUES (
          auth.uid(),
          'INITIAL_BOOTSTRAP: ADMIN ROLE ASSIGNED',
          'profiles',
          auth.uid()
        );

        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'Invalid setup secret.';
    END IF;
END;
$$;

-- Secure role assignment RPC for ADMINs
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id UUID,
  new_role app_role,
  target_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calling_user_role app_role;
  old_role app_role;
BEGIN
  -- Get the role of the caller
  SELECT role FROM public.profiles WHERE id = auth.uid() INTO calling_user_role;

  -- Enforce that ONLY ADMIN can run this (Requirement 3 & 7)
  IF calling_user_role IS NULL OR calling_user_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify roles.';
  END IF;

  -- Get the current role for audit logging
  SELECT role FROM public.profiles WHERE id = target_user_id INTO old_role;
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- Enforce that a user cannot modify their own role (Requirement 1)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Administrators cannot modify their own role.';
  END IF;

  -- ROOT ADMIN PROTECTION: Block any modification to the root admin account (admin@gmail.com)
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = target_user_id AND email = 'admin@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Access Denied: The root administrator account is immutable and cannot be modified.';
  END IF;

  -- Temporarily bypass the before_profile_update trigger
  PERFORM set_config('app.bypass_profile_trigger', 'true', true);

  -- Perform update
  UPDATE public.profiles
  SET 
    role = new_role,
    organization_id = target_org_id,
    updated_at = NOW()
  WHERE id = target_user_id;

  PERFORM set_config('app.bypass_profile_trigger', 'false', true);

  -- Log action in audit_logs (Requirement 8)
  INSERT INTO public.audit_logs (user_id, action, target_type, target_id)
  VALUES (
    auth.uid(),
    'UPDATE_ROLE: ' || old_role::TEXT || ' -> ' || new_role::TEXT,
    'profiles',
    target_user_id
  );

  RETURN TRUE;
END;
$$;

-- Secure NGO registration RPC (creates pending org and registers user request)
CREATE OR REPLACE FUNCTION submit_ngo_application(org_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  existing_org_id UUID;
BEGIN
  -- Verify the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User must be authenticated to submit an NGO application.';
  END IF;

  -- Check if user is already associated with an organization
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() INTO existing_org_id;
  IF existing_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bad Request: User is already associated with an organization.';
  END IF;

  -- Insert the new organization with PENDING status
  INSERT INTO public.organizations (name, status)
  VALUES (org_name, 'PENDING')
  RETURNING id INTO new_org_id;

  -- Temporarily bypass the before_profile_update trigger
  PERFORM set_config('app.bypass_profile_trigger', 'true', true);

  -- Update the user's profile to NGO role and link to the organization
  UPDATE public.profiles
  SET
    role = 'NGO',
    organization_id = new_org_id,
    updated_at = NOW()
  WHERE id = auth.uid();

  PERFORM set_config('app.bypass_profile_trigger', 'false', true);

  -- Log in audit logs (Requirement 8)
  INSERT INTO public.audit_logs (user_id, action, target_type, target_id)
  VALUES (
    auth.uid(),
    'SUBMIT_NGO_APPLICATION: ' || org_name,
    'organizations',
    new_org_id
  );

  RETURN TRUE;
END;
$$;

-- -------------------------------------------------------------
-- Phase 8: Core Engine RPCs
-- -------------------------------------------------------------

-- Calculate Priority Score RPC
CREATE OR REPLACE FUNCTION calculate_priority(req_id UUID)
RETURNS FLOAT8
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req_record RECORD;
    score FLOAT8 := 0.0;
BEGIN
    SELECT * INTO req_record FROM public.emergency_requests WHERE id = req_id;
    IF NOT FOUND THEN RETURN 0.0; END IF;

    -- Urgency base score (max 40)
    IF req_record.urgency = 'CRITICAL' THEN score := score + 40;
    ELSIF req_record.urgency = 'HIGH' THEN score := score + 30;
    ELSIF req_record.urgency = 'MEDIUM' THEN score := score + 20;
    ELSE score := score + 10;
    END IF;

    -- People affected score (max 25, capping at 50 people for max score)
    score := score + LEAST(25, (req_record.people_affected::FLOAT8 / 50.0) * 25);

    -- Could add shortage (max 20) and distance (max 15) here in future

    UPDATE public.emergency_requests SET priority_score = score WHERE id = req_id;
    RETURN score;
END;
$$;

-- Run Matching Engine RPC
CREATE OR REPLACE FUNCTION run_matching_engine()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req RECORD;
    res RECORD;
    veh RECORD;
    matches_created INT := 0;
BEGIN
    -- Loop through UNDER_REVIEW requests ordered by priority
    FOR req IN SELECT * FROM public.emergency_requests WHERE status = 'UNDER_REVIEW' ORDER BY priority_score DESC LOOP
        -- Find an available resource (simplified matching - grab any available resource)
        SELECT * INTO res FROM public.resources WHERE status = 'AVAILABLE' LIMIT 1;
        IF FOUND THEN
            -- Find an available vehicle
            SELECT * INTO veh FROM public.vehicles WHERE status = 'AVAILABLE' LIMIT 1;
            IF FOUND THEN
                -- Create a recommended dispatch
                INSERT INTO public.dispatches (request_id, resource_id, vehicle_id, status, eta_minutes)
                VALUES (req.id, res.id, veh.id, 'RECOMMENDED', floor(random() * 60 + 15)::int);

                -- Mark request as MATCHED
                UPDATE public.emergency_requests SET status = 'MATCHED' WHERE id = req.id;
                
                -- Mark resource and vehicle as RESERVED/ASSIGNED
                UPDATE public.resources SET status = 'RESERVED' WHERE id = res.id;
                UPDATE public.vehicles SET status = 'ASSIGNED' WHERE id = veh.id;
                
                matches_created := matches_created + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN matches_created;
END;
$$;

-- Simulate Disaster RPC
CREATE OR REPLACE FUNCTION simulate_disaster()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Find a generic profile to attribute reports to (fallback)
    SELECT id INTO demo_user_id FROM public.profiles LIMIT 1;

    IF demo_user_id IS NOT NULL THEN
        -- Insert mock requests (Delhi / NCR region)
        INSERT INTO public.emergency_requests (reported_by, description, lat, lng, people_affected, urgency, category, status)
        VALUES 
        (demo_user_id, 'Severe flash flooding near Pragati Maidan, families stranded on first floor.', 28.6189, 77.2410, 15, 'CRITICAL', 'Flooding & Water', 'UNDER_REVIEW'),
        (demo_user_id, 'Structure damage and collapse after heavy tremor near Connaught Place.', 28.6315, 77.2167, 8, 'CRITICAL', 'Shelter Collapse', 'UNDER_REVIEW'),
        (demo_user_id, 'Power outage and transformer failure at local trauma ward.', 28.5672, 77.2100, 50, 'HIGH', 'Power / Utility Out', 'UNDER_REVIEW'),
        (demo_user_id, 'Commercial unit fire spreading near market complex.', 28.6500, 77.2300, 40, 'HIGH', 'Active Fire', 'UNDER_REVIEW'),
        (demo_user_id, 'Requesting emergency trauma triage kits and potable drinking water.', 28.6100, 77.2000, 30, 'MEDIUM', 'Medical Emergency', 'UNDER_REVIEW');
        
        -- Recalculate priorities
        PERFORM calculate_priority(id) FROM public.emergency_requests WHERE status = 'UNDER_REVIEW';
    END IF;

    RETURN TRUE;
END;
$$;

-- -------------------------------------------------------------
-- Public Disaster Safety Broadcast System
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'WARNING', -- 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'INFO'
    region TEXT DEFAULT 'ALL_REGIONS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

ALTER TABLE public.public_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of broadcasts" 
ON public.public_broadcasts FOR SELECT 
USING (true);

CREATE POLICY "Allow Ops and Admins to manage broadcasts" 
ON public.public_broadcasts FOR ALL 
USING (get_my_role() IN ('OPERATIONS', 'ADMIN'));

-- Enable Supabase Realtime for broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_broadcasts;

-- -------------------------------------------------------------
-- Cloud Storage Setup for Emergency Photo Evidence
-- -------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('emergency-evidence', 'emergency-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload emergency evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'emergency-evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Public read emergency evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'emergency-evidence');

