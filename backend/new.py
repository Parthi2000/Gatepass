from sqlalchemy import create_engine, Table, Column, Integer, String, MetaData, TIMESTAMP, text
import bcrypt
from datetime import datetime

# Database URL
DATABASE_URL = "postgresql://postgres:12345@localhost:5432/package_management"

# Connect to PostgreSQL
engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Define the users table (must match your actual schema)
users = Table('users', metadata,
    Column('id', Integer, primary_key=True),
    Column('email', String, nullable=False),
    Column('password_hash', String, nullable=False),
    Column('full_name', String, nullable=False),
    Column('role', String, nullable=False, default='employee'),
    Column('employee_id', String, nullable=False),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text("now()")),
    Column('updated_at', TIMESTAMP(timezone=True), nullable=True),
)

# Function to hash passwords
def hash_password(plain_password):
    return bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Sample user data
user_data = [
    {
        "email": "alice@example.com",
        "password": "alicepass",
        "full_name": "Alice Johnson",
        "role": "employee",
        "employee_id": "EMP1001"
    },
    {
        "email": "bob@example.com",
        "password": "bobpass",
        "full_name": "Bob Smith",
        "role": "admin",
        "employee_id": "EMP1002"
    },
    {
        "email": "charlie@example.com",
        "password": "charliepass",
        "full_name": "Charlie Brown",
        "role": "employee",
        "employee_id": "EMP1003"
    },
    {
        "email": "diana@example.com",
        "password": "dianapass",
        "full_name": "Diana Prince",
        "role": "manager",
        "employee_id": "EMP1004"
    }
]

# Insert users
with engine.connect() as connection:
    for user in user_data:
        insert_stmt = users.insert().values(
            email=user["email"],
            password_hash=hash_password(user["password"]),
            full_name=user["full_name"],
            role=user["role"],
            employee_id=user["employee_id"],
            created_at=datetime.now()
        )
        connection.execute(insert_stmt)

print("✅ Users inserted successfully.")
