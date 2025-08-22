@echo off
echo Starting FastAPI Package Management Backend...

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please edit .env file with your database credentials before running again.
    pause
    exit /b 1
)

REM Install dependencies
echo Installing/updating dependencies...
pip install -r requirements.txt

REM Run database migrations
echo Running database migrations...
alembic upgrade head

REM Start the server
echo Starting FastAPI server on http://localhost:8000
echo API Documentation available at:
echo   - Swagger UI: http://localhost:8000/docs
echo   - ReDoc: http://localhost:8000/redoc

uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
