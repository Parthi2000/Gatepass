from app.database import engine

def make_tracking_number_nullable():
    with engine.connect() as connection:
        # Start a transaction
        with connection.begin():
            # Execute the ALTER TABLE statement
            connection.execute(
                "ALTER TABLE packages ALTER COLUMN tracking_number DROP NOT NULL;"
            )
            print("Successfully made tracking_number nullable")

if __name__ == "__main__":
    make_tracking_number_nullable()
