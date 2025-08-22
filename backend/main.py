from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from app.database import engine, Base
from app.routers import auth, packages, users, uploads, gate_pass
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Package Management API",
    description="FastAPI backend for package management system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure request size limits for file uploads
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class FileSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size: int = 524288000):  # 500MB default
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_size:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request too large. Maximum size allowed: {self.max_size / (1024*1024):.1f}MB"}
                )
        response = await call_next(request)
        return response

# Add file size middleware
app.add_middleware(FileSizeMiddleware, max_size=settings.max_file_size)
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000", 
        "http://localhost:8080",
        "http://192.168.5.107:5173",
        "http://192.168.5.107:5174", 
        "http://192.168.5.107:3000", 
        "http://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(packages.router, prefix="/api/packages", tags=["packages"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(gate_pass.router, prefix="/api/gate-pass", tags=["gate-pass"])

@app.get("/")
async def root():
    return {"message": "Package Management API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True
    )
