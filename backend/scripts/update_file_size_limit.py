#!/usr/bin/env python3
"""
Script to update file upload size limits across the application.
Usage: python update_file_size_limit.py <size_in_mb>
Example: python update_file_size_limit.py 500  # Sets limit to 500MB
"""

import sys
import os
import re
from pathlib import Path

def update_config_py(size_bytes: int, size_mb: int):
    """Update the config.py file with new file size limit."""
    config_path = Path(__file__).parent.parent / "app" / "config.py"
    
    with open(config_path, 'r') as f:
        content = f.read()
    
    # Update the max_file_size line
    pattern = r'max_file_size:\s*int\s*=\s*\d+\s*#.*'
    replacement = f'max_file_size: int = {size_bytes}  # {size_mb}MB'
    content = re.sub(pattern, replacement, content)
    
    with open(config_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated config.py: max_file_size = {size_bytes} ({size_mb}MB)")

def update_env_example(size_bytes: int, size_mb: int):
    """Update the .env.example file with new file size limit."""
    env_path = Path(__file__).parent.parent / ".env.example"
    
    if env_path.exists():
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Update the MAX_FILE_SIZE line
        pattern = r'MAX_FILE_SIZE=\d+.*'
        replacement = f'MAX_FILE_SIZE={size_bytes}  # {size_mb}MB - Increase this value for larger file uploads'
        content = re.sub(pattern, replacement, content)
        
        with open(env_path, 'w') as f:
            f.write(content)
        
        print(f"✅ Updated .env.example: MAX_FILE_SIZE = {size_bytes} ({size_mb}MB)")

def update_main_py(size_bytes: int, size_mb: int):
    """Update the main.py file middleware default size."""
    main_path = Path(__file__).parent.parent / "main.py"
    
    with open(main_path, 'r') as f:
        content = f.read()
    
    # Update the FileSizeMiddleware default
    pattern = r'def __init__\(self, app, max_size: int = \d+\):'
    replacement = f'def __init__(self, app, max_size: int = {size_bytes}):'
    content = re.sub(pattern, replacement, content)
    
    with open(main_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated main.py: FileSizeMiddleware max_size = {size_bytes} ({size_mb}MB)")

def main():
    if len(sys.argv) != 2:
        print("Usage: python update_file_size_limit.py <size_in_mb>")
        print("Example: python update_file_size_limit.py 500")
        sys.exit(1)
    
    try:
        size_mb = int(sys.argv[1])
        if size_mb <= 0:
            raise ValueError("Size must be positive")
    except ValueError as e:
        print(f"Error: Invalid size '{sys.argv[1]}'. Please provide a positive integer.")
        sys.exit(1)
    
    size_bytes = size_mb * 1024 * 1024  # Convert MB to bytes
    
    print(f"🔧 Updating file upload size limit to {size_mb}MB ({size_bytes} bytes)...")
    print()
    
    try:
        update_config_py(size_bytes, size_mb)
        update_env_example(size_bytes, size_mb)
        update_main_py(size_bytes, size_mb)
        
        print()
        print("🎉 File upload size limit updated successfully!")
        print()
        print("📋 Next steps:")
        print("1. If you have a .env file, update MAX_FILE_SIZE manually")
        print("2. Restart your FastAPI server to apply changes")
        print("3. Test with a file upload to verify the new limits")
        print()
        print(f"📊 Current limits:")
        print(f"   • Maximum file size: {size_mb}MB")
        print(f"   • Maximum request size: {size_mb}MB")
        
    except Exception as e:
        print(f"❌ Error updating files: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
