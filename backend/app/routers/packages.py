import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Query, Body
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import and_
from datetime import datetime, date, time
import os
from dateutil import parser

from app.database import get_db
from app.models import (
    Package as PackageModel, 
    User, 
    PackageDimension as PackageDimensionModel, 
    PackageImage as PackageImageModel, 
    ReturnInfo as ReturnInfoModel, 
    PackageItem as PackageItemModel,
    PackageImage
)
from app.schemas import (
    PackageCreate, 
    PackageUpdate, 
    Package as PackageSchema, 
    PackageDimensionCreate, 
    ReturnInfoCreate, 
    ReturnInfo as ReturnInfoSchema,
    PackageWithReturnInfo,
    PackageWithWeights,
    PackageImagesResponse
)
from app.auth import get_current_user, require_role

router = APIRouter()

@router.get("/", response_model=List[PackageSchema])
def get_packages(
    manager_id: Optional[int] = Query(None, description="Filter by assigned manager"),
    status: Optional[str] = Query(None, description="Filter by package status"),
    search: Optional[str] = Query(None, description="Search in tracking number, description, recipient, to_address"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    sort_by: Optional[str] = Query(None, description="Sort by date, priority, or recipient"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PackageModel).options(
        joinedload(PackageModel.items),
        joinedload(PackageModel.dimensions),
        joinedload(PackageModel.submitted_by_user),
        joinedload(PackageModel.assigned_manager),
        joinedload(PackageModel.approved_by_user),
        joinedload(PackageModel.rejected_by_user)
    )
    
    # Apply filters
    if manager_id:
        query = query.filter(PackageModel.assigned_to_manager == manager_id)
    
    if status:
        # If logistics user requests 'submitted' packages, also include 'logistics_pending' packages
        if status == 'submitted' and hasattr(current_user, 'role') and current_user.role == 'logistics':
            query = query.filter(PackageModel.status.in_([status, 'logistics_pending']))
        else:
            query = query.filter(PackageModel.status == status)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (PackageModel.tracking_number.ilike(search_filter)) |
            (PackageModel.remarks.ilike(search_filter)) |
            (PackageModel.recipient.ilike(search_filter)) |
            (PackageModel.to_address.ilike(search_filter)) |
            (PackageModel.notes.ilike(search_filter))
        )
    
    if start_date:
        query = query.filter(PackageModel.submitted_at >= datetime.combine(start_date, datetime.min.time()))
    
    if end_date:
        query = query.filter(PackageModel.submitted_at <= datetime.combine(end_date, datetime.max.time()))
    
    if priority:
        query = query.filter(PackageModel.priority == priority)
    
    # Apply sorting
    if sort_by == "date":
        query = query.order_by(Package.submitted_at.desc())
    elif sort_by == "priority":
        priority_order = {"high": 3, "medium": 2, "low": 1}
        query = query.order_by(PackageModel.priority.desc())
    elif sort_by == "recipient":
        query = query.order_by(PackageModel.recipient.asc())
    else:
        query = query.order_by(PackageModel.submitted_at.desc())
    
    packages = query.all()
    return packages

@router.get("/{package_id}", response_model=PackageSchema)
def get_package(package_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    package = db.query(PackageModel)\
        .options(
            joinedload(PackageModel.items),
            joinedload(PackageModel.dimensions),
            joinedload(PackageModel.assigned_manager),
            joinedload(PackageModel.submitted_by_user)
        )\
        .filter(PackageModel.id == package_id)\
        .first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package

@router.get("/tracking/{tracking_number}", response_model=PackageSchema)
def get_package_by_tracking(
    tracking_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a package by its tracking number
    """
    package = (
        db.query(PackageModel)
        .options(
            joinedload(PackageModel.assigned_manager),
            joinedload(PackageModel.items),
            joinedload(PackageModel.dimensions),
            joinedload(PackageModel.return_records)
        )
        .filter(PackageModel.tracking_number == tracking_number.upper())
        .first()
    )
        
    if not package:
        raise HTTPException(
            status_code=404, 
            detail=f"No package found with tracking number: {tracking_number}"
        )
        
    return package

@router.put("/{package_id}/return", response_model=PackageSchema)
def update_package_return_status(
    package_id: int,
    return_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update package return status and create return info record
    """
    print(f"[DEBUG] Received return data: {return_data}")
    
    # Get the package
    db_package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not db_package:
        print(f"[ERROR] Package with ID {package_id} not found")
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Log current package state
    print(f"[DEBUG] Current package state - ID: {db_package.id}, Status: {db_package.status}, Return Status: {db_package.return_status}")
    
    try:
        # Update return status (handle case sensitivity)
        return_status = return_data.get('returnStatus') or return_data.get('return_status')
        if not return_status:
            raise HTTPException(status_code=400, detail="returnStatus is required")
            
        print(f"[DEBUG] Updating return status to: {return_status}")
        db_package.return_status = return_status
        
        # If marking as returned, create return info record
        if return_status.lower() == 'returned':
            print("[DEBUG] Processing return details...")
            
            # Handle case-insensitive field names
            returned_by_name = return_data.get('returnedBy') or return_data.get('returned_by')
            return_notes = return_data.get('returnNotes') or return_data.get('return_notes')
            return_date = return_data.get('returnDate') or return_data.get('return_date')
            return_time = return_data.get('returnTime') or return_data.get('return_time')
            
            print(f"[DEBUG] Returned By: {returned_by_name}")
            print(f"[DEBUG] Return Notes: {return_notes}")
            print(f"[DEBUG] Return Date: {return_date}")
            print(f"[DEBUG] Return Time: {return_time}")
            
            if not returned_by_name:
                raise HTTPException(status_code=400, detail="returnedBy is required")
            
            # Combine date and time if provided
            returned_at = None
            if return_date:
                try:
                    if return_time:
                        # Combine date and time
                        datetime_str = f"{return_date} {return_time}"
                        returned_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
                    else:
                        # Use date only
                        returned_at = datetime.strptime(return_date, "%Y-%m-%d")
                    print(f"[DEBUG] Parsed datetime: {returned_at}")
                except Exception as e:
                    print(f"[ERROR] Error parsing date/time: {str(e)}")
                    returned_at = datetime.utcnow()
            else:
                returned_at = datetime.utcnow()
            
            # Check if return info already exists for this package
            existing_return = db.query(ReturnInfoModel).filter(
                ReturnInfoModel.package_id == package_id
            ).first()
            
            if existing_return:
                # Update existing return info
                print("[DEBUG] Updating existing return info")
                existing_return.returned_by = returned_by_name  # Store name directly
                existing_return.return_notes = return_notes
                existing_return.returned_at = returned_at
                existing_return.status = "returned"
                db.add(existing_return)
            else:
                # Create new return info record
                print("[DEBUG] Creating new return info record")
                return_info = ReturnInfoModel(
                    package_id=package_id,
                    returned_by=returned_by_name,  # Store name directly
                    return_notes=return_notes,
                    returned_at=returned_at,
                    status="returned"
                )
                db.add(return_info)
        
        # Save changes to database
        db.add(db_package)
        db.commit()
        db.refresh(db_package)
        
        print("[DEBUG] Successfully updated package return status")
        print(f"[DEBUG] Updated package: {db_package}")
        
        return db_package
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error updating package return status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update package return status: {str(e)}")

@router.post("/", response_model=PackageSchema)
def create_package(
    package: PackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_package = PackageModel(
        **package.dict(),
        submitted_by=current_user.id
    )
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    return db_package

@router.put("/{package_id}", response_model=PackageSchema)
def update_package(
    package_id: int,
    package_update: PackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not db_package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    update_data = package_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_package, key, value)
    
    if package_update.status == "approved":
        db_package.approved_at = datetime.utcnow()
    elif package_update.status == "dispatched":
        db_package.dispatched_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_package)
    return db_package

from pydantic import BaseModel

class PackageStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

@router.patch("/{package_id}/status")
async def update_package_status(
    package_id: int,
    update_data: PackageStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get the package from database
    db_package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not db_package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Update the package status
    db_package.status = update_data.status
    if update_data.notes:
        db_package.notes = update_data.notes

    # Update timestamps and user tracking based on status
    if update_data.status == "approved":
        db_package.approved_at = datetime.utcnow()
        db_package.approved_by = current_user.id
        print(f"Set approved_at to {db_package.approved_at} and approved_by to {current_user.id}")
    elif update_data.status == "rejected":
        db_package.rejected_by = current_user.id
        db_package.rejected_at = datetime.utcnow()
        print(f"Set rejected_by to {current_user.id} and rejected_at to {db_package.rejected_at}")
    elif update_data.status == "dispatched":
        db_package.dispatched_at = datetime.utcnow()
        print(f"Set dispatched_at to {db_package.dispatched_at}")
    elif update_data.status == "returned":  # Add this block
        db_package.returned_at = datetime.utcnow()
        db_package.returned_by = current_user.id
        print(f"Set returned_at to {db_package.returned_at} and returned_by to {current_user.id}")
    
    # Commit changes to database
    db.commit()
    db.refresh(db_package)
    
    return {"message": f"Package status updated to {update_data.status}", "package": db_package}

@router.patch("/{package_id}/assign")
def assign_package_to_manager(
    package_id: int,
    manager_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    db_package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not db_package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    db_package.assigned_to_manager = manager_id
    # Manager name is now derived from the assigned_to_manager relationship
    db.commit()
    return {"message": "Package assigned successfully"}

@router.post("/{package_id}/dimensions")
def add_package_dimension(
    package_id: int,
    dimension: PackageDimensionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    db_dimension = PackageDimensionModel(**dimension.dict())
    db.add(db_dimension)
    db.commit()
    db.refresh(db_dimension)
    return db_dimension

@router.post("/create-with-files", response_model=PackageSchema)
async def create_package_with_files(
    gate_pass_serial_number: str = Form(..., description="Gate pass serial number"),
    tracking_number: str = Form(None, description="Optional tracking number"),
    recipient: str = Form(...),
    to_address: str = Form(..., description="Delivery address"),
    project_code: str = Form(...),
    remarks: str = Form(None),
    notes: str = Form(None),
    priority: str = Form("medium"),
    assigned_to_manager: int = Form(None),
    is_returnable: bool = Form(False),
    return_date: str = Form(None),
    return_reason: str = Form(None),
    transportation_type: str = Form("courier"),
    vehicle_details: str = Form(None),
    carrier_name: str = Form(None),
    courier_name: str = Form(None),
    courier_tracking_number: str = Form(None),
    number_of_packages: int = Form(1),
    po_number: str = Form(None),
    po_date: str = Form(None),
    dimensions: str = Form(None),  # JSON string array of dimension objects
    items: str = Form(...),  # JSON string
    image_before_packing: List[UploadFile] = File(None),
    # Note: image_after_packing is removed from employee form submission
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print("\n=== DEBUG: Starting package creation ===")
    print(f"Raw items JSON: {items}")  # Debug: Print raw items JSON
    import json
    from datetime import datetime
    
    try:
        # Parse items JSON
        items_data = json.loads(items) if items else []
        print(f"Parsed items data: {items_data}")  # Debug: Print parsed items data
        
        # Parse dimensions JSON
        dimensions_data = json.loads(dimensions) if dimensions else []
        print(f"Parsed dimensions data: {dimensions_data}")  # Debug: Print parsed dimensions data
        
        # Clean input
        gate_pass_serial_number = gate_pass_serial_number.strip()
            
        # Always generate a new random tracking number in the format TRKXXXXXXX
        import random
        import string
        
        # Generate 8 mixed letters/numbers for better pattern (11 total)
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
        
        # Create tracking number with TRK prefix
        tracking_number = f"TRK{random_chars}"
        
        # Ensure the tracking number is set in the response
        # This will be included in the API response
        
        # Parse PO date if provided
        po_date_parsed = None
        if po_date:
            try:
                po_date_parsed = datetime.strptime(po_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid PO date format. Please use YYYY-MM-DD"
                )
        
        # Parse return date if provided
        return_date_parsed = None
        if return_date:
            try:
                return_date_parsed = datetime.strptime(return_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid return date format. Please use YYYY-MM-DD"
                )
        
        # Set status based on transportation type
        status = "logistics_pending" if transportation_type == "courier" else "submitted"
        
        # Create package data dictionary with all fields
        package_data = {
            "gate_pass_serial_number": gate_pass_serial_number,
            "tracking_number": tracking_number,
            "recipient": recipient,
            "to_address": to_address,
            "project_code": project_code,
            "remarks": remarks,  # Add remarks field
            "notes": notes,
            "priority": priority,
            "assigned_to_manager": assigned_to_manager,
            "is_returnable": is_returnable,
            "return_date": return_date_parsed,
            "return_reason": return_reason,
            "transportation_type": transportation_type,
            "vehicle_details": vehicle_details,
            "carrier_name": carrier_name,
            "courier_name": courier_name,
            "courier_tracking_number": courier_tracking_number,
            "number_of_packages": number_of_packages,
            "po_number": po_number,
            "po_date": po_date_parsed,
            "status": status,  # Set the status based on transportation type
            "items": items_data,
            "dimensions": dimensions_data
        }
        
        # Create a clean package data dictionary without None values and without items/dimensions
        clean_package_data = {
            k: v for k, v in package_data.items() 
            if k not in ['items', 'dimensions'] and v is not None
        }
        
        # Explicitly set the tracking number to ensure it's not overridden
        clean_package_data['tracking_number'] = tracking_number
        
        # Create the package with the cleaned data
        db_package = PackageModel(
            **clean_package_data,
            submitted_by=current_user.id
        )
        db.add(db_package)
        db.flush()  # This assigns an ID to db_package without committing
        
        # Add package items
        if 'items' in package_data and package_data['items']:
            print("Processing items:", package_data['items'])  # Debug log
            for item_data in package_data['items']:
                print("Creating item with data:", item_data)  # Debug log
                
                # Create the package item
                package_item = PackageItemModel(
                    package_id=db_package.id,
                    description=item_data.get('description', ''),
                    serial_number=item_data.get('serial_number'),
                    hsn_code=item_data.get('hsn_code'),
                    quantity=item_data.get('quantity', 1),
                    unit_price=item_data.get('unit_price'),
                    value=item_data.get('value')
                )
                print("Created package_item:", package_item.__dict__)  # Debug log
                db.add(package_item)
                db.flush()  # Get the item ID
        
        # Add package dimensions from the dimensions array
        if 'dimensions' in package_data and package_data['dimensions']:
            print("Processing dimensions:", package_data['dimensions'])  # Debug log
            for dimension_data in package_data['dimensions']:
                print("Creating dimension with data:", dimension_data)  # Debug log
                
                # Create the package dimension record
                package_dimension = PackageDimensionModel(
                    package_id=db_package.id,
                    weight=float(dimension_data.get('weight')) if dimension_data.get('weight') else None,
                    weight_unit=dimension_data.get('weight_unit', 'kg'),
                    dimension=dimension_data.get('dimension'),
                    purpose=dimension_data.get('purpose')
                )
                print("Created package_dimension:", package_dimension.__dict__)  # Debug log
                db.add(package_dimension)
        
        # Process and save images
        import os
        from datetime import datetime
        from app.config import settings
        
        print(f"DEBUG: image_before_packing received: {image_before_packing}")
        
        # Validate file sizes
        def validate_file_size(files, file_type):
            if files:
                for file in files:
                    if file.filename:
                        # Read file content to check size
                        content = file.file.read()
                        file.file.seek(0)  # Reset file pointer
                        if len(content) > settings.max_file_size:
                            raise HTTPException(
                                status_code=413, 
                                detail=f"{file_type} file '{file.filename}' is too large. Maximum size allowed: {settings.max_file_size / (1024*1024):.1f}MB"
                            )
        
        # Validate before packing images only
        validate_file_size(image_before_packing, "Before packing image")
        
        # Use existing uploads directory
        upload_dir = "uploads/package_images"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Process before packing images only
        if image_before_packing:
            for image_file in image_before_packing:
                if image_file.filename:
                    # Generate unique filename
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    file_extension = os.path.splitext(image_file.filename)[1]
                    base_filename = os.path.splitext(image_file.filename)[0]
                    unique_filename = f"before_{db_package.id}_{timestamp}_{base_filename}{file_extension}"
                    file_path = os.path.join(upload_dir, unique_filename)
                    
                    # Save file to disk
                    with open(file_path, "wb") as buffer:
                        content = await image_file.read()
                        buffer.write(content)
                    
                    # Save image record to database
                    package_image = PackageImageModel(
                        package_id=db_package.id,
                        image_path=file_path,
                        image_type="before_packing"
                    )
                    db.add(package_image)
                    print(f"Saved before packing image: {file_path}")
        
        db.commit()
        db.refresh(db_package)
        
        return db_package
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/{package_id}/return", response_model=ReturnInfoSchema)
def create_return_info(
    package_id: int,
    returned_by: str = Form(..., description="Name of person returning the package"),
    return_date: str = Form(..., description="Return date in YYYY-MM-DD format"),
    return_time: str = Form(None, description="Return time in HH:MM format"),
    return_notes: str = Form(None, description="Additional notes about the return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create return information for a package
    """
    # Check if package exists
    db_package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not db_package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Parse return date and time
    try:
        if return_time:
            datetime_str = f"{return_date} {return_time}"
            returned_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
        else:
            returned_at = datetime.strptime(return_date, "%Y-%m-%d")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time format: {str(e)}")
    
    # Check if return info already exists
    existing_return = db.query(ReturnInfoModel).filter(
        ReturnInfoModel.package_id == package_id
    ).first()
    
    if existing_return:
        raise HTTPException(status_code=400, detail="Return information already exists for this package")
    
    # Create return info record
    return_info = ReturnInfoModel(
        package_id=package_id,
        returned_by=returned_by,  # Store the name directly
        return_notes=return_notes,
        returned_at=returned_at,
        status="returned"
    )
    
    # Update package return status
    db_package.return_status = "returned"
    
    try:
        db.add(return_info)
        db.add(db_package)
        db.commit()
        db.refresh(return_info)
        
        # Refresh the return_info object
        db.refresh(return_info)
        
        return return_info
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))

@router.get("/{package_id}/with-return", response_model=PackageWithReturnInfo)
def get_package_with_return(
    package_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Get package details with return information from return_info table
    """
    # Get package with relationships
    package = db.query(PackageModel).options(
        joinedload(PackageModel.assigned_manager),
        joinedload(PackageModel.items),
        joinedload(PackageModel.dimensions),
        joinedload(PackageModel.return_records)
    ).filter(
        PackageModel.id == package_id
    ).first()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Convert package to dict and add relationship data
    result = package.__dict__.copy()
    
    # Add user names
    result['submitted_by_name'] = package.submitted_by_user.full_name if package.submitted_by_user else "Unknown"
    if package.assigned_manager:
        result['assigned_manager_name'] = package.assigned_manager.full_name
    
    # Get return info from return_info table
    return_info = db.query(ReturnInfoModel)\
        .filter(ReturnInfoModel.package_id == package_id)\
        .order_by(ReturnInfoModel.returned_at.desc())\
        .first()
    
    # Add return info if exists
    if return_info:
        result.update({
            'returned_by': return_info.returned_by,  # returned_by is now a string (name)
            'return_notes': return_info.return_notes,
            'returned_at': return_info.returned_at,
            'return_status': package.return_status or 'returned'
        })
    else:
        result.update({
            'returned_by': None,
            'return_notes': None,
            'returned_at': None,
            'return_status': package.return_status
        })
    
    return result

@router.get("/{package_id}/with-weights", response_model=PackageWithWeights)
def get_package_with_weights(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get package details with weight information
    """
    # Get package with dimensions and relationships
    package = db.query(PackageModel)\
        .options(
            joinedload(PackageModel.dimensions),
            joinedload(PackageModel.submitted_by_user),
            joinedload(PackageModel.assigned_manager),
            joinedload(PackageModel.items)
        )\
        .filter(PackageModel.id == package_id)\
        .first()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Convert package to dict and add relationship data
    result = package.__dict__
    
    # Add user names
    result['submitted_by_name'] = package.submitted_by_user.full_name if package.submitted_by_user else "Unknown"
    if package.assigned_manager:
        result['assigned_manager_name'] = package.assigned_manager.full_name
    
    # Add dimensions
    if hasattr(package, 'dimensions') and package.dimensions:
        result['dimensions'] = [
            {
                'id': dim.id,
                'weight': dim.weight,
                'weight_unit': dim.weight_unit or 'kg',
                'dimension': dim.dimension,
                'purpose': dim.purpose,
                'remarks': dim.remarks,
                'is_common': dim.is_common,
                'created_at': dim.created_at,
                'updated_at': dim.updated_at
            } for dim in package.dimensions
        ]
    else:
        result['dimensions'] = []
    
    return result

@router.get("/{package_id}/images", response_model=PackageImagesResponse)
def get_package_images(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all images for a package, grouped by type
    """
    # Verify package exists
    package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Get all images for this package
    images = db.query(PackageImage)\
        .filter(PackageImage.package_id == package_id)\
        .all()
    
    # Group images by type
    result = PackageImagesResponse()
    
    for img in images:
        image_data = {
            'id': img.id,
            'image_path': img.image_path,
            'image_type': img.image_type,
            'created_at': img.created_at
        }
        
        if img.image_type == 'before_packing':
            result.before_packing.append(image_data)
        elif img.image_type == 'after_packing':
            result.after_packing.append(image_data)
    
    return result

@router.put("/{package_id}/logistics", response_model=PackageSchema)
async def update_package_logistics(
    package_id: int,
    courier_name: str = Form(..., description="Courier company name"),
    courier_tracking_number: str = Form(None, description="Courier tracking number"),
    dimensions: str = Form(None, description="JSON array of dimension objects"),
    notes: str = Form(None, description="Additional logistics notes"),
    logistics_processed: str = Form("true", description="Mark as processed by logistics"),
    processed_by_logistics: str = Form(..., description="ID of logistics user processing"),
    image_after_packing: List[UploadFile] = File(None, description="Images after packing"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["logistics", "admin"]))
):
    """
    Update package logistics information (courier details, weight, dimensions, and images after packing)
    Only accessible by logistics role
    """
    db_package = db.query(PackageModel).filter(PackageModel.id == package_id).first()
    if not db_package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    try:
        # Update courier information
        db_package.courier_name = courier_name
        if courier_tracking_number:
            db_package.courier_tracking_number = courier_tracking_number
        
        # Update package status to 'submitted' to indicate logistics processing is complete
        db_package.status = 'submitted'
        
        # Update package notes if provided
        if notes:
            if db_package.notes:
                db_package.notes += f"\n[Logistics Update]: {notes}"
            else:
                db_package.notes = f"[Logistics Update]: {notes}"
        
        # Handle dimensions array if provided
        if dimensions:
            try:
                dimensions_data = json.loads(dimensions)
                if not isinstance(dimensions_data, list):
                    dimensions_data = [dimensions_data]
                
                # Delete existing dimensions for this package
                db.query(PackageDimensionModel).filter(
                    PackageDimensionModel.package_id == package_id
                ).delete()
                
                # Add new dimension records
                for dim in dimensions_data:
                    if dim.get('weight') or dim.get('dimension'):
                        new_dimension = PackageDimensionModel(
                            package_id=package_id,
                            weight=float(dim['weight']) if dim.get('weight') else None,
                            weight_unit=dim.get('weight_unit', 'kg'),
                            dimension=dim.get('dimension'),
                            purpose=dim.get('purpose', 'item')
                        )
                        db.add(new_dimension)
                
                db.flush()  # Flush to get any database-generated IDs
                
            except json.JSONDecodeError as e:
                print(f"Error parsing dimensions JSON: {e}")
                # If JSON parsing fails, try to save as a single dimension
                if any([weight, dimension]):
                    new_dimension = PackageDimensionModel(
                        package_id=package_id,
                        weight=float(weight) if weight else None,
                        weight_unit=weight_unit,
                        dimension=dimension,
                        purpose='main'
                    )
                    db.add(new_dimension)
        
        # Process and save images after packing
        if image_after_packing:
            import os
            from app.config import settings
            
            # Validate file sizes
            for file in image_after_packing:
                if file.filename:
                    # Read file content to check size
                    content = file.file.read()
                    file.file.seek(0)  # Reset file pointer
                    if len(content) > settings.max_file_size:
                        raise HTTPException(
                            status_code=413, 
                            detail=f"Image file '{file.filename}' is too large. Maximum size allowed: {settings.max_file_size / (1024*1024):.1f}MB"
                        )
            
            # Use existing uploads directory
            upload_dir = "uploads/package_images"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Process after packing images
            for image_file in image_after_packing:
                if image_file.filename:
                    # Generate unique filename
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    file_extension = os.path.splitext(image_file.filename)[1]
                    base_filename = os.path.splitext(image_file.filename)[0]
                    unique_filename = f"after_{package_id}_{timestamp}_{base_filename}{file_extension}"
                    file_path = os.path.join(upload_dir, unique_filename)
                    
                    # Save file to disk
                    with open(file_path, "wb") as buffer:
                        content = await image_file.read()
                        buffer.write(content)
                    
                    # Save image record to database
                    package_image = PackageImageModel(
                        package_id=package_id,
                        image_path=file_path,
                        image_type="after_packing"
                    )
                    db.add(package_image)
                    print(f"Saved after packing image: {file_path}")
        
        # Mark as processed by logistics
        if logistics_processed == "true":
            # Add a custom field to track logistics processing
            # Since we don't have this field in the model, we'll use notes
            logistics_note = f"[Logistics Processed by {current_user.full_name or current_user.email} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}]"
            if db_package.notes:
                db_package.notes += f"\n{logistics_note}"
            else:
                db_package.notes = logistics_note
        
        db.add(db_package)
        db.commit()
        db.refresh(db_package)
        
        return db_package
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update logistics information: {str(e)}")