# FastAPI Package Management Backend

This is a FastAPI-based backend for the package management system, replacing the previous Express.js backend.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Package Management**: Full CRUD operations for packages with filtering and search
- **User Management**: Role-based users (employee, manager, security, admin)
- **File Uploads**: Image uploads for package documentation
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic for database schema management

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)
- **File Uploads**: FastAPI UploadFile with PIL for image processing
- **Migrations**: Alembic

## Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb package_management
   
   # Update DATABASE_URL in .env
   DATABASE_URL=postgresql://username:password@localhost:5432/package_management
   ```

4. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

5. **Start the server**:
   ```bash
   # Development mode with auto-reload
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Production mode
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Packages
- `GET /api/packages` - Get all packages (with filtering)
- `POST /api/packages` - Create new package
- `GET /api/packages/{package_id}` - Get package by ID
- `PUT /api/packages/{package_id}` - Update package
- `PATCH /api/packages/{package_id}/status` - Update package status
- `PATCH /api/packages/{package_id}/assign` - Assign package to manager
- `POST /api/packages/{package_id}/dimensions` - Add package dimensions
- `POST /api/packages/{package_id}/returns` - Create return record

### Users
- `GET /api/users` - Get all users (admin/manager only)
- `GET /api/users/managers` - Get all managers
- `GET /api/users/{user_id}` - Get user by ID

### Uploads
- `POST /api/uploads/package/{package_id}` - Upload package image
- `GET /api/uploads/package/{package_id}` - Get package images

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://username:password@localhost:5432/package_management` |
| `SECRET_KEY` | JWT secret key | `your-secret-key-here` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token expiry | `30` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173,http://localhost:3000` |
| `UPLOAD_DIR` | Upload directory | `uploads` |
| `MAX_FILE_SIZE` | Max file upload size | `10485760` (10MB) |

## Database Schema

### Users
- `id` - Primary key
- `email` - Unique email
- `password_hash` - Hashed password
- `full_name` - Full name
- `role` - User role (employee/manager/security/admin)
- `employee_id` - Unique employee ID
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Packages
- `id` - Primary key
- `tracking_number` - Package tracking number
- `description` - Package description
- `recipient` - Package recipient
- `destination` - Destination/project code
- `po_number` - Purchase order number
- `po_date` - Purchase order date
- `notes` - Additional notes
- `priority` - Priority level (high/medium/low)
- `status` - Package status (submitted/approved/dispatched/returned)
- `gate_pass_serial_number` - Gate pass serial number
- `submitted_by` - User who submitted the package
- `assigned_to_manager` - Assigned manager
- `assigned_manager_name` - Manager name
- `submitted_at` - Submission timestamp
- `approved_at` - Approval timestamp
- `dispatched_at` - Dispatch timestamp
- `return_status` - Return status

### Package Dimensions
- `id` - Primary key
- `package_id` - Foreign key to packages
- `length` - Package length
- `width` - Package width
- `height` - Package height
- `weight` - Package weight
- `created_at` - Creation timestamp

### Package Images
- `id` - Primary key
- `package_id` - Foreign key to packages
- `image_path` - Image file path
- `image_type` - Image type
- `created_at` - Creation timestamp

### Return Info
- `id` - Primary key
- `package_id` - Foreign key to packages
- `returned_by` - User who processed the return
- `return_notes` - Return notes
- `returned_at` - Return timestamp
- `status` - Return status

## User Roles

- **employee**: Can submit packages and view their own packages
- **manager**: Can review and approve packages assigned to them
- **security**: Can dispatch packages and handle returns
- **admin**: Full system access

## Frontend Integration

To use this backend with the existing React frontend, update the API URLs:

1. **Update service files** to use the new FastAPI endpoints:
   - Change `http://192.168.5.244:3001/api` to `http://localhost:8000/api`

2. **Update authentication** to use the new login endpoint format

3. **File uploads** will be available at `http://localhost:8000/uploads/`

## Development

### Running Tests
```bash
# Install testing dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Downgrade migrations
alembic downgrade -1
```

## Production Deployment

1. **Environment Setup**:
   ```bash
   export DATABASE_URL=your_production_db_url
   export SECRET_KEY=your_production_secret_key
   ```

2. **Docker Deployment**:
   ```bash
   # Build image
   docker build -t package-management-api .
   
   # Run container
   docker run -p 8000:8000 package-management-api
   ```

## API Documentation

Once the server is running, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
