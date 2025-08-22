from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Any, Dict, Union
from datetime import datetime, date

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "employee"
    employee_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class PackageBase(BaseModel):
    tracking_number: Optional[str] = None
    remarks: Optional[str] = None
    recipient: str
    updated_at: Optional[datetime] = None
    to_address: Optional[str] = None  # Address information
    project_code: str
    po_number: Optional[str] = None
    po_date: Optional[date] = None
    notes: Optional[str] = None
    priority: str = "medium"
    status: str = "submitted"
    gate_pass_serial_number: Optional[str] = None
    is_returnable: bool = False
    remarks: Optional[str] = None
    return_date: Optional[date] = None
    return_reason: Optional[str] = None
    vehicle_details: Optional[str] = None
    carrier_name: Optional[str] = None
    courier_name: Optional[str] = None
    courier_tracking_number: Optional[str] = None
    transportation_type: Optional[str] = None
    number_of_packages: int = 1

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    remarks: Optional[str] = None
    recipient: Optional[str] = None
    project_code: Optional[str] = None
    po_number: Optional[str] = None
    po_date: Optional[date] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    gate_pass_serial_number: Optional[str] = None
    is_returnable: Optional[bool] = None
    return_date: Optional[date] = None
    return_reason: Optional[str] = None
    transportation_type: Optional[str] = None
    number_of_packages: Optional[int] = None

class Package(PackageBase):
    id: int
    submitted_by: int
    assigned_to_manager: Optional[int] = None
    approved_by: Optional[int] = None
    rejected_by: Optional[int] = None
    # Manager name is derived from the assigned_to_manager relationship
    submitted_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    return_status: Optional[str] = None
    submitted_by_user: Optional[User] = None
    assigned_manager: Optional[User] = None
    approved_by_user: Optional[User] = None
    rejected_by_user: Optional[User] = None
    items: List["PackageItem"] = Field(default_factory=list)
    dimensions: List["PackageDimension"] = Field(default_factory=list)
    
    class Config:
        from_attributes = True

class PackageWithReturnInfo(Package):
    """Package schema including return information"""
    returned_by: Optional[str] = None
    returned_at: Optional[datetime] = None
    return_notes: Optional[str] = None
    return_status: Optional[str] = None
    submitted_by_name: Optional[str] = None
    assigned_manager_name: Optional[str] = None

class PackageWithWeights(Package):
    """Package schema including weight information"""
    dimensions: List[Dict[str, Any]] = Field(default_factory=list)
    submitted_by_name: Optional[str] = None
    assigned_manager_name: Optional[str] = None

class PackageImageResponse(BaseModel):
    """Response model for package images"""
    id: int
    image_path: str
    image_type: str
    created_at: datetime

class PackageImagesResponse(BaseModel):
    """Response model for package images grouped by type"""
    before_packing: List[PackageImageResponse] = Field(default_factory=list)
    after_packing: List[PackageImageResponse] = Field(default_factory=list)

class PackageDimensionBase(BaseModel):
    weight: Optional[float] = None
    weight_unit: Optional[str] = 'kg'
    dimension: Optional[str] = None
    purpose: Optional[str] = None

class PackageDimensionCreate(PackageDimensionBase):
    package_id: int

class PackageDimension(PackageDimensionBase):
    id: int
    package_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PackageImageBase(BaseModel):
    image_path: str
    image_type: str = "package"

class PackageImageCreate(PackageImageBase):
    package_id: int

class PackageImage(PackageImageBase):
    id: int
    package_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReturnInfoBase(BaseModel):
    package_id: int
    returned_by: str  # Store person's name as text
    return_notes: Optional[str] = None
    status: str = "returned"

class ReturnInfoCreate(ReturnInfoBase):
    pass

class ReturnInfo(ReturnInfoBase):
    id: int
    returned_at: datetime
    package: Optional[Package] = None
    
    class Config:
        from_attributes = True


class PackageItemBase(BaseModel):
    description: str
    quantity: int = 1
    serial_number: Optional[str] = None
    hsn_code: Optional[str] = None
    unit_price: Optional[float] = None
    value: Optional[float] = None

class PackageItemCreate(PackageItemBase):
    pass

class PackageItemUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[int] = None
    serial_number: Optional[str] = None
    hsn_code: Optional[str] = None
    value: Optional[float] = None

class PackageItem(PackageItemBase):
    id: int
    package_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Gate Pass Sequence Schemas
class GatePassSequenceBase(BaseModel):
    financial_year: str
    pass_type: str  # "RGP" or "NRGP"
    current_sequence: int = 0

class GatePassSequenceCreate(GatePassSequenceBase):
    pass

class GatePassSequenceUpdate(BaseModel):
    current_sequence: Optional[int] = None

class GatePassSequence(GatePassSequenceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Gate Pass Generation Request/Response
class GatePassGenerateRequest(BaseModel):
    is_returnable: bool = False

class GatePassGenerateResponse(BaseModel):
    gate_pass_number: str
    financial_year: str
    pass_type: str
    sequence_number: int
