import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.system import User
from app.core import security


def seed_users():
    db = SessionLocal()

    print("Starting database seeding...")

    try:
        db.execute(
            text(
                "SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM users;"
            )
        )
        db.commit()
        print("Successfully synced 'users' table ID sequence.")
    except Exception as e:
        db.rollback()
        print(f"Sequence sync skipped (ignore if not using PostgreSQL): {e}")
    # -------------------------------------------

    test_users = [
        {
            "email": "ahmedelmarrouni1@gmail.com",
            "role": "admin",
            "first_name": "Ahmed",
            "last_name": "El marrouni",
        },
        {
            "email": "ahmed.elmarrouni@ynov.com",
            "role": "pedagogical_manager",
            "first_name": "Manager",
            "last_name": "User",
        },
        {
            "email": "elmarrouni.ahmed@cyberground.ma",
            "role": "teacher",
            "first_name": "Teacher",
            "last_name": "User",
        },
        {
            "email": "aelmarrouni@lapelota.ma",
            "role": "student",
            "first_name": "Student",
            "last_name": "User",
        },
    ]

    for user_data in test_users:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if not user:
            new_user = User(
                email=user_data["email"],
                role=user_data["role"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                password_hash=security.hash_password("password123"),
                is_2fa_enabled=False,
            )
            db.add(new_user)
            print(f"Created {user_data['role']} user: {user_data['email']}")
        else:
            print(f"User {user_data['email']} already exists. Skipping.")

    db.commit()
    db.close()
    print("Seeding completed successfully.")


if __name__ == "__main__":
    seed_users()
