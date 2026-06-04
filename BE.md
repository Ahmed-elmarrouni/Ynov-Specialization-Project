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

6. **Data Generation (Extract & Transform)**
   I bypassed Mockaroo's row limits by writing a custom Python script using the `pandas` and `faker` libraries. This allowed me to generate a massive, production-scale dataset containing 1,000 students, 15 teachers, and 8,000 grades. To ensure this data is useful for my future Machine Learning models (such as clustering and predicting student failure), I programmed hidden traits into the dataset. For example, I assigned each student a hidden "aptitude" score and a "truancy" probability, which mathematically forces students with high absences to receive lower grades. Full details of this process, including environment troubleshooting, are documented in `DATA.md`.

7. **Database Seeding (Load)**
   To automatically populate the PostgreSQL database, I built a custom ETL script (`seed_database.py`). Instead of inserting rows one by one, I connected SQLAlchemy to my secure `.env` variables and used the Pandas `to_sql()` function to push entire CSV files into the database in a matter of seconds. Because the database is strictly relational, I programmed the script to insert data in a specific hierarchy to respect foreign key constraints—starting with reference tables (`academic_years`, `users`) and finishing with dependent data (`students`, `grades`). Finally, I made the script idempotent by adding a `TRUNCATE CASCADE` command; this safely wipes old data before inserting new data, allowing me to safely re-run the pipeline anytime without causing duplicates.
