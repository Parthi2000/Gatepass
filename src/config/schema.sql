-- Drop tables if they exist (cascade to handle dependencies)
DROP TABLE IF EXISTS package_items CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL, -- Store hashed passwords
  role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'manager', 'security', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create packages table
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  tracking_number VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  recipient VARCHAR(100) NOT NULL,
  destination TEXT NOT NULL,
  submitted_by INTEGER REFERENCES users(id),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected', 'dispatched')),
  assigned_to_manager INTEGER REFERENCES users(id),
  assigned_manager_name VARCHAR(100),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejected_by INTEGER REFERENCES users(id), -- Assuming rejected_by is also a user
  rejected_at TIMESTAMP,
  dispatched_by INTEGER REFERENCES users(id),
  dispatched_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT, -- General notes for the package
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Gate pass information
  gate_pass_serial_number VARCHAR(50) UNIQUE, -- Should likely be unique if generated (*unique constraint removed)
  date DATE, -- Consider if this is gate pass date or submission date (already have submitted_at)
  to_address TEXT,
  
  -- Returnable package information
  is_returnable BOOLEAN DEFAULT FALSE,
  return_date DATE,
  return_reason TEXT,
  return_status VARCHAR(20) CHECK (return_status IN ('pending', 'returned', 'overdue')),
  
  -- Transportation details
  transportation_type VARCHAR(20) CHECK (transportation_type IN ('courier', 'byHand')),
  courier_name VARCHAR(100),
  courier_tracking_number VARCHAR(100),
  carrier_name VARCHAR(100),
  vehicle_details TEXT,

  -- Package level details (not item specific)
  purpose TEXT, -- Overall purpose of the package
  remarks TEXT, -- Overall remarks for the package
  number_of_packages INTEGER DEFAULT 1, -- Number of physical packages this entry represents
  weight VARCHAR(50), -- Total weight
  weight_unit VARCHAR(10) CHECK (weight_unit IN ('kg', 'g', 'lb')),

  -- Resubmission tracking
  resubmitted BOOLEAN DEFAULT FALSE,
  previous_rejection INTEGER REFERENCES packages(id) ON DELETE SET NULL, -- Avoid cycles on delete if needed
  
  -- Timestamps for tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create package_items table for multi-item support
CREATE TABLE package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    hsn_code VARCHAR(50),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price VARCHAR(50), -- Consider NUMERIC(10,2) for currency
    description TEXT, -- Item specific description
    purpose TEXT, -- Item specific purpose
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password, role) VALUES
('John Employee', 'employee@example.com', '$2a$10$rCDMFcSCFCCKDra7nt5A2.GbRNiZrNsXQu3BgL0TcqjVEJGNGTrC.', 'employee'),
('Sarah Manager', 'manager1@example.com', '$2a$10$rCDMFcSCFCCKDra7nt5A2.GbRNiZrNsXQu3BgL0TcqjVEJGNGTrC.', 'manager'),
('Michael Manager', 'manager2@example.com', '$2a$10$rCDMFcSCFCCKDra7nt5A2.GbRNiZrNsXQu3BgL0TcqjVEJGNGTrC.', 'manager'),
('Emma Security', 'security@example.com', '$2a$10$rCDMFcSCFCCKDra7nt5A2.GbRNiZrNsXQu3BgL0TcqjVEJGNGTrC.', 'security'),
('Admin User', 'admin@example.com', '$2a$10$rCDMFcSCFCCKDra7nt5A2.GbRNiZrNsXQu3BgL0TcqjVEJGNGTrC.', 'admin');

-- Create an index on packages(submitted_by) for faster lookups
CREATE INDEX idx_packages_submitted_by ON packages(submitted_by);
-- Create an index on packages(assigned_to_manager) for faster lookups
CREATE INDEX idx_packages_assigned_to_manager ON packages(assigned_to_manager);
-- Create an index on package_items(package_id) for faster lookups
CREATE INDEX idx_package_items_package_id ON package_items(package_id);

-- Note: All passwords are 'password123' - hashed with bcrypt
-- You might want to add a trigger to update 'updated_at' timestamps automatically.
/*
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_package_items_updated_at
BEFORE UPDATE ON package_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
*/

-- Remove single image columns from packages table
ALTER TABLE packages DROP COLUMN IF EXISTS image_before_packing_path;
ALTER TABLE packages DROP COLUMN IF EXISTS image_after_packing_path;

-- Create package_images table for multiple images per package
CREATE TABLE IF NOT EXISTS package_images (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    image_type VARCHAR(10) NOT NULL CHECK (image_type IN ('before', 'after')),
    image_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_package_images_package_id ON package_images(package_id);
