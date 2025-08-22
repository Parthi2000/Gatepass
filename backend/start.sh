#!/bin/bash

# FastAPI Package Management Backend Startup Script

echo "Starting FastAPI Package Management Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your database credentials before running again."
    exit 1
fi

# Install dependencies if requirements.txt is newer than installed packages
if [ -f requirements.txt ]; then
    echo "Installing/updating dependencies..."
    pip install -r requirements.txt
fi

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the server
echo "Starting FastAPI server on http://localhost:8000"
echo "API Documentation available at:"
echo "  - Swagger UI: http://localhost:8000/docs"
echo "  - ReDoc: http://localhost:8000/redoc"

uvicorn main:app --reload --host 0.0.0.0 --port 8000
