import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from PIL import Image


from app.database import get_db
from app.models import User, Package, PackageImage
from app.auth import get_current_user
from app.config import settings

router = APIRouter()

UPLOAD_DIR = settings.upload_dir
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
MAX_FILE_SIZE = settings.max_file_size

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def allowed_file(filename: str):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {ext.lstrip('.') for ext in ALLOWED_EXTENSIONS}

@router.post("/package/{package_id}")
def upload_package_image(
    package_id: int,
    file: UploadFile = File(...),
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate package exists
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Validate file
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Read file content
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size allowed: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
        )
    
    # Generate unique filename
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, 'wb') as buffer:
        buffer.write(content)
    
    # Create thumbnail
    try:
        with Image.open(file_path) as img:
            img.thumbnail((300, 300))
            thumbnail_filename = f"thumb_{unique_filename}"
            thumbnail_path = os.path.join(UPLOAD_DIR, thumbnail_filename)
            img.save(thumbnail_path)
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
    
    # Save to database
    db_image = PackageImage(
        package_id=package_id,
        image_path=f"/uploads/{unique_filename}",
        image_type="package"
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    
    return {
        "message": "Image uploaded successfully",
        "image_path": f"/uploads/{unique_filename}",
        "image_id": db_image.id
    }

@router.get("/package/{package_id}")
def get_package_images(
    package_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    images = db.query(PackageImage).filter(PackageImage.package_id == package_id).all()
    return images
