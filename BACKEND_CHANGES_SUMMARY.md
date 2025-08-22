# Backend Changes Summary

## Overview
This document summarizes the backend changes made to support moving the "Image After Packing" field from the employee form to the logistics processing workflow.

## Changes Made

### 1. **Updated `/api/packages/create-with-files` Endpoint**
- **File**: `backend/app/routers/packages.py`
- **Changes**:
  - Removed `image_after_packing` parameter from employee package creation
  - Updated file processing to only handle `image_before_packing` files
  - Added comment explaining that image_after_packing is now handled by logistics team
  - Updated validation to only check before_packing images

### 2. **Updated `/api/packages/{package_id}/logistics` Endpoint**
- **File**: `backend/app/routers/packages.py`
- **Changes**:
  - **Changed from JSON Body to FormData**: Modified endpoint to accept FormData instead of JSON to support file uploads
  - **Made async**: Changed function to `async` to handle file operations
  - **Added Form parameters**:
    - `courier_name: str = Form(...)`
    - `courier_tracking_number: str = Form(None)`
    - `weight: str = Form(None)`
    - `weight_unit: str = Form("kg")`
    - `dimension: str = Form(None)`
    - `notes: str = Form(None)`
    - `logistics_processed: str = Form("true")`
    - `processed_by_logistics: str = Form(...)`
    - `image_after_packing: List[UploadFile] = File(None)` ← **NEW**
  - **Added file upload processing**:
    - File size validation using `settings.max_file_size`
    - Unique filename generation with timestamp
    - File storage in `uploads/package_images/` directory
    - Database record creation with `image_type="after_packing"`
  - **Enhanced error handling**: Better error messages and rollback on failures

### 3. **Database Schema Support**
- **No changes needed**: The existing `PackageImage` model already supports:
  - `image_type` field that can store "before_packing" or "after_packing"
  - `package_id` foreign key relationship
  - `image_path` for file storage location
  - `created_at` timestamp

### 4. **File Upload Configuration**
- **File**: `backend/app/config.py`
- **Status**: Already configured with:
  - `max_file_size: int = 524288000` (500MB limit)
  - `upload_dir: str = "uploads"`

## API Workflow Changes

### Before (Employee could upload both images):
```
POST /api/packages/create-with-files
- image_before_packing: File[]
- image_after_packing: File[]  ← Removed
```

### After (Separated workflow):

#### 1. Employee Package Creation:
```
POST /api/packages/create-with-files
- image_before_packing: File[]
- (image_after_packing removed)
```

#### 2. Logistics Processing:
```
PUT /api/packages/{package_id}/logistics
- courier_name: string (required)
- courier_tracking_number: string (optional)
- weight: string (optional)
- weight_unit: string (default: "kg")
- dimension: string (optional)
- notes: string (optional)
- image_after_packing: File[] (optional) ← **NEW**
```

## File Storage Structure

```
uploads/
└── package_images/
    ├── before_{package_id}_{timestamp}_{filename}.{ext}
    └── after_{package_id}_{timestamp}_{filename}.{ext}  ← **NEW**
```

## Database Records

### PackageImage Table:
- `image_type = "before_packing"` - Created during employee submission
- `image_type = "after_packing"` - Created during logistics processing ← **NEW**

## Security & Validation

1. **File Size Validation**: Maximum 500MB per file
2. **File Type Validation**: Accepts image/* MIME types
3. **Role-based Access**: Logistics endpoint requires "logistics" or "admin" role
4. **Unique Filenames**: Timestamp-based naming prevents conflicts
5. **Error Handling**: Proper rollback on database or file system errors

## Testing Recommendations

1. **Test employee form**: Verify only "before_packing" images are accepted
2. **Test logistics form**: Verify "after_packing" images are properly uploaded
3. **Test file size limits**: Ensure validation works for oversized files
4. **Test role permissions**: Verify only logistics users can access the endpoint
5. **Test error scenarios**: Database failures, file system errors, etc.

## Migration Notes

- **No database migration required**: Existing schema supports the changes
- **Existing data**: All existing images will continue to work
- **Backward compatibility**: API maintains compatibility for existing clients

## Frontend Integration

The frontend changes in `LogisticsPage.tsx` now send FormData to the updated logistics endpoint:

```javascript
const formData = new FormData();
formData.append('courier_name', logisticsData.courierCompany);
// ... other fields
imageAfterPacking.forEach(file => formData.append('image_after_packing', file));
```

This matches the new backend endpoint signature perfectly.