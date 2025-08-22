# Package Management System

A comprehensive package management system built with React frontend and FastAPI backend.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router v6** for routing
- **React Hook Form** for form management
- **React Webcam** for camera integration
- **React Barcode** for barcode generation

### Backend
- **FastAPI** (Python) for REST API
- **PostgreSQL** database
- **SQLAlchemy** ORM
- **Alembic** for database migrations
- **JWT** authentication
- **Pydantic** for data validation

## 📁 Project Structure

```
project/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── auth.py         # Authentication utilities
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Database connection
│   │   └── routers/        # API endpoints
│   ├── alembic/            # Database migrations
│   ├── requirements.txt    # Python dependencies
│   ├── main.py            # FastAPI entry point
│   └── README.md          # Backend setup guide
├── src/                   # React frontend
│   ├── components/        # React components
│   ├── services/          # API services
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── config/            # Configuration files
├── uploads/               # File uploads directory
├── public/               # Static assets
└── package.json          # Frontend dependencies
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL 12+

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Packages
- `GET /api/packages` - Get all packages (with filtering)
- `POST /api/packages` - Create new package
- `GET /api/packages/{id}` - Get package by ID
- `PUT /api/packages/{id}/status` - Update package status
- `PUT /api/packages/{id}/assign` - Assign package to manager
- `POST /api/packages/{id}/return` - Handle package return

### Users
- `GET /api/users` - Get all users
- `GET /api/users?role={role}` - Get users by role
- `GET /api/users/{id}` - Get user by ID

### Uploads
- `POST /api/uploads/packages/{id}/images` - Upload package images
- `GET /api/uploads/{filename}` - Get uploaded file

## 👥 User Roles

- **Employee**: Submit packages, view own packages
- **Manager**: Approve/reject packages, assign packages
- **Security**: View packages, update security status
- **Admin**: Full system access

## 🔐 Authentication

The system uses JWT tokens for authentication. After login, the token is stored in localStorage and included in API requests via the Authorization header.

## 📊 Features

- **Package Submission**: Employees can submit packages with details and images
- **Approval Workflow**: Managers can approve/reject packages
- **Assignment System**: Packages can be assigned to specific managers
- **Status Tracking**: Real-time package status updates
- **Image Uploads**: Support for package documentation images
- **Search & Filter**: Advanced package filtering and search
- **User Management**: Role-based access control
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Development

### Backend Development
- API documentation available at `http://localhost:8000/docs`
- Database migrations with Alembic
- SQLAlchemy ORM for database operations
- Pydantic models for request/response validation

### Frontend Development
- Hot module replacement with Vite
- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture
- API services centralized in `src/services/`

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest  # Run backend tests
```

### Frontend Testing
```bash
npm run test  # Run frontend tests
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Port Already in Use**
   - Backend: Change port in `.env` file
   - Frontend: Vite will auto-select available port

3. **CORS Issues**
   - Ensure backend URL is correctly set in frontend services
   - Check CORS configuration in FastAPI

## 📖 API Documentation

Once the backend is running, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
# Gatepass_New_version
