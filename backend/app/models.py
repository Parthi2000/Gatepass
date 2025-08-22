import random
import string
from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, ForeignKey, Text, Float, event, Index
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base

def generate_tracking_number():
    """Generate a random tracking number in the format TRK + 8 mixed letters/numbers (11 total)"""
    letters = string.ascii_uppercase
    digits = string.digits
    
    # Create a pattern with alternating letters and numbers for better readability
    random_chars = ''
    for i in range(8):
        if i % 2 == 0:  # Even positions: prefer letters but sometimes numbers
            if random.random() < 0.7:  # 70% chance of letter
                random_chars += random.choice(letters)
            else:
                random_chars += random.choice(digits)
        else:  # Odd positions: prefer numbers but sometimes letters
            if random.random() < 0.7:  # 70% chance of number
                random_chars += random.choice(digits)
            else:
                random_chars += random.choice(letters)
    
    return f"TRK{random_chars}"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String, default="employee")
    employee_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    packages = relationship("Package", foreign_keys="Package.submitted_by", back_populates="submitted_by_user")
    assigned_packages = relationship("Package", foreign_keys="Package.assigned_to_manager", back_populates="assigned_manager")

class Package(Base):
    __tablename__ = "packages"
    
    id = Column(Integer, primary_key=True, index=True)
    # Tracking number is automatically generated in TRKXXXXXXX format
    tracking_number = Column(String, index=True, nullable=False, default=None)
    remarks = Column(Text, nullable=True)
    recipient = Column(String)
    to_address = Column(String, nullable=False)  # Replaces destination field
    project_code = Column(String)
    po_number = Column(String, nullable=True)
    po_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    priority = Column(String, default="medium")
    status = Column(String, default="submitted")
    gate_pass_serial_number = Column(String, nullable=True)
    
    submitted_by = Column(Integer, ForeignKey("users.id"))
    assigned_to_manager = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Manager name is now derived from the assigned_to_manager relationship
    
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    
    return_status = Column(String, nullable=True)
    is_returnable = Column(Boolean, default=False, nullable=True)
    return_date = Column(Date, nullable=True)
    return_reason = Column(Text, nullable=True)
    vehicle_details = Column(Text, nullable=True)
    carrier_name = Column(String, nullable=True)
    courier_name = Column(String, nullable=True)
    courier_tracking_number = Column(String, nullable=True)
    transportation_type = Column(String, nullable=True)
    number_of_packages = Column(Integer, default=1, nullable=False)
    
    submitted_by_user = relationship("User", foreign_keys=[submitted_by], back_populates="packages")
    assigned_manager = relationship("User", foreign_keys=[assigned_to_manager], back_populates="assigned_packages")
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    rejected_by_user = relationship("User", foreign_keys=[rejected_by])
    return_records = relationship("ReturnInfo", back_populates="package")
    dimensions = relationship("PackageDimension", back_populates="package")
    images = relationship("PackageImage", back_populates="package")
    items = relationship("PackageItem", back_populates="package")


@event.listens_for(Package, 'before_insert')
def generate_tracking_number_before_insert(mapper, connection, target):
    """Automatically generate a tracking number before a new Package is inserted"""
    if not target.tracking_number:
        target.tracking_number = generate_tracking_number()

class PackageDimension(Base):
    __tablename__ = "package_dimensions"
    
    id = Column(Integer, primary_key=True, index=True)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=False)
    weight = Column(Float, nullable=True)
    weight_unit = Column(String, default='kg', nullable=True)
    dimension = Column(String, nullable=True)  # For storing dimension string like "10x20x30 cm"
    purpose = Column(Text, nullable=True)  # Purpose for this dimension entry
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    package = relationship("Package", back_populates="dimensions")

class PackageImage(Base):
    __tablename__ = "package_images"
    
    id = Column(Integer, primary_key=True, index=True)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=False)
    image_path = Column(String)
    image_type = Column(String, default="package")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    package = relationship("Package", back_populates="images")

class ReturnInfo(Base):
    __tablename__ = "return_info"
    
    id = Column(Integer, primary_key=True, index=True)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=False)
    returned_by = Column(String, nullable=False)  # Store person's name as text
    return_notes = Column(Text)
    returned_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="returned")
    
    package = relationship("Package", back_populates="return_records")

class PackageItem(Base):
    __tablename__ = "package_items"
    
    id = Column(Integer, primary_key=True, index=True)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    serial_number = Column(String, nullable=True)
    hsn_code = Column(String, nullable=True)
    unit_price = Column(Float, nullable=True)
    value = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    package = relationship("Package", back_populates="items")


class GatePassSequence(Base):
    """
    Model for storing gate pass sequence numbers by financial year and pass type
    Ensures unique sequential numbering for gate passes
    """
    __tablename__ = "gate_pass_sequences"
    
    id = Column(Integer, primary_key=True, index=True)
    financial_year = Column(String(4), nullable=False)  # e.g., "2526" for 2025-26
    pass_type = Column(String(10), nullable=False)  # "RGP" or "NRGP"
    current_sequence = Column(Integer, default=0, nullable=False)  # Current sequence number
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Ensure unique combination of financial_year and pass_type
    __table_args__ = (
        Index('idx_fy_pass_type', 'financial_year', 'pass_type', unique=True),
    )
