# Backend Setup and Database Migration

In this phase of the project, I built the database architecture for the EduTrack Analytics platform. I used Python, SQLAlchemy, Alembic, and PostgreSQL to create a scalable and secure backend system.

## Steps I Completed

1. **Database Creation**
   I created a new, empty PostgreSQL database named `edutrack_db` to store all the platform's data.

2. **Writing SQLAlchemy Models**
   Instead of writing raw SQL, I designed the database schema using Python classes (SQLAlchemy). I organized these models into separate files (`system.py`, `student.py`, and `academic.py`) inside the `app/models/` folder to keep the code clean and modular.

3. **Configuring Alembic**
   - I initialized Alembic to manage my database migrations.
   - To keep my credentials safe, I used a `.env` file for the database connection instead of putting the password directly in `alembic.ini`.
   - I configured the `alembic/env.py` file to load my environment variables and read all my SQLAlchemy models automatically.

4. **Generating the Migration File**
   I ran the command `alembic revision --autogenerate -m "create_initial_schema"`. Alembic compared my Python models with the empty database and automatically generated a migration script containing all the necessary table creation instructions.

5. **Applying the Migration**
   Finally, I executed `alembic upgrade head`. This command applied the migration script to PostgreSQL, successfully building all the tables, columns, and foreign key relationships in the database.
