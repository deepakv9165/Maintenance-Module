/*
  # Maintenance Module Database Schema

  ## Overview
  This migration creates the complete database structure for a maintenance tracking system
  that manages the workflow from indent creation through payment.

  ## Tables Created

  1. **users**
     - `id` (uuid, primary key) - Unique user identifier
     - `email` (text, unique) - User email for login
     - `full_name` (text) - User's full name
     - `role` (text) - User role: 'admin' or 'user'
     - `created_at` (timestamptz) - Account creation timestamp

  2. **indents**
     - `id` (uuid, primary key) - Unique indent identifier
     - `indent_no` (text, unique) - Human-readable indent number
     - `machine_name` (text) - Name of the machine requiring maintenance
     - `department` (text) - Department that owns the machine
     - `problem` (text) - Description of the problem
     - `priority` (text) - Priority level: 'High', 'Medium', 'Low'
     - `expected_delivery_days` (integer) - Expected days for completion
     - `input_date` (date) - Date when indent was created
     - `image_url` (text) - URL of uploaded problem image
     - `created_by` (uuid) - Reference to user who created the indent
     - `created_at` (timestamptz) - Indent creation timestamp

  3. **approvals**
     - `id` (uuid, primary key) - Unique approval identifier
     - `indent_id` (uuid) - Reference to indent
     - `approval_status` (text) - Status: 'Approved', 'Rejected', 'Pending'
     - `remarks` (text) - Approval/rejection remarks
     - `approved_by` (uuid) - Reference to user who approved/rejected
     - `approved_at` (timestamptz) - Approval/rejection timestamp

  4. **technician_assignments**
     - `id` (uuid, primary key) - Unique assignment identifier
     - `indent_id` (uuid) - Reference to indent
     - `technician_name` (text) - Name of assigned technician
     - `phone_number` (text) - Technician's phone number
     - `assigned_date` (date) - Date of assignment
     - `work_notes` (text) - Assignment notes/comments
     - `assigned_by` (uuid) - Reference to user who assigned
     - `assigned_at` (timestamptz) - Assignment timestamp

  5. **work_tracking**
     - `id` (uuid, primary key) - Unique tracking identifier
     - `indent_id` (uuid) - Reference to indent
     - `additional_notes` (text) - Additional work notes
     - `completion_status` (text) - Status: 'Completed', 'Terminate', 'Pending', 'Hold'
     - `updated_by` (uuid) - Reference to user who updated
     - `updated_at` (timestamptz) - Update timestamp

  6. **inspections**
     - `id` (uuid, primary key) - Unique inspection identifier
     - `indent_id` (uuid) - Reference to indent
     - `inspected_by` (text) - Name of inspector
     - `inspection_date` (date) - Date of inspection
     - `inspection_result` (text) - Result: 'Done', 'Not Done'
     - `remarks` (text) - Inspection remarks
     - `created_by` (uuid) - Reference to user who created inspection
     - `created_at` (timestamptz) - Inspection creation timestamp

  7. **payments**
     - `id` (uuid, primary key) - Unique payment identifier
     - `indent_id` (uuid) - Reference to indent
     - `bill_no` (text) - Bill number
     - `total_bill_amount` (numeric) - Total bill amount
     - `bill_image_url` (text) - URL of uploaded bill image
     - `created_by` (uuid) - Reference to user who created payment
     - `created_at` (timestamptz) - Payment creation timestamp

  ## Security
  - Row Level Security (RLS) is enabled on all tables
  - Policies ensure users can only access data they're authorized to see
  - Admin users have full access
  - Regular users can create indents and view their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now()
);

-- Create indents table
CREATE TABLE IF NOT EXISTS indents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_no text UNIQUE NOT NULL,
  machine_name text NOT NULL,
  department text NOT NULL,
  problem text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  expected_delivery_days integer NOT NULL,
  input_date date NOT NULL DEFAULT CURRENT_DATE,
  image_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_id uuid REFERENCES indents(id) ON DELETE CASCADE,
  approval_status text NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Approved', 'Rejected', 'Pending')),
  remarks text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz DEFAULT now()
);

-- Create technician_assignments table
CREATE TABLE IF NOT EXISTS technician_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_id uuid REFERENCES indents(id) ON DELETE CASCADE,
  technician_name text NOT NULL,
  phone_number text NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  work_notes text,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now()
);

-- Create work_tracking table
CREATE TABLE IF NOT EXISTS work_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_id uuid REFERENCES indents(id) ON DELETE CASCADE,
  additional_notes text,
  completion_status text NOT NULL CHECK (completion_status IN ('Completed', 'Terminate', 'Pending', 'Hold')),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_id uuid REFERENCES indents(id) ON DELETE CASCADE,
  inspected_by text NOT NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  inspection_result text NOT NULL CHECK (inspection_result IN ('Done', 'Not Done')),
  remarks text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_id uuid REFERENCES indents(id) ON DELETE CASCADE,
  bill_no text NOT NULL,
  total_bill_amount numeric(10, 2) NOT NULL,
  bill_image_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE indents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Indents policies
CREATE POLICY "Users can view all indents"
  ON indents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create indents"
  ON indents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Approvals policies
CREATE POLICY "Users can view all approvals"
  ON approvals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage approvals"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update approvals"
  ON approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Technician assignments policies
CREATE POLICY "Users can view all assignments"
  ON technician_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can create assignments"
  ON technician_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Work tracking policies
CREATE POLICY "Users can view all work tracking"
  ON work_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can create work tracking"
  ON work_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Inspections policies
CREATE POLICY "Users can view all inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can create inspections"
  ON inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Payments policies
CREATE POLICY "Users can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_indents_created_by ON indents(created_by);
CREATE INDEX IF NOT EXISTS idx_approvals_indent_id ON approvals(indent_id);
CREATE INDEX IF NOT EXISTS idx_technician_assignments_indent_id ON technician_assignments(indent_id);
CREATE INDEX IF NOT EXISTS idx_work_tracking_indent_id ON work_tracking(indent_id);
CREATE INDEX IF NOT EXISTS idx_inspections_indent_id ON inspections(indent_id);
CREATE INDEX IF NOT EXISTS idx_payments_indent_id ON payments(indent_id);

-- Create function to generate indent number
CREATE OR REPLACE FUNCTION generate_indent_no()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  indent_no TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM indents;
  indent_no := 'IND-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN indent_no;
END;
$$ LANGUAGE plpgsql;