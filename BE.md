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

8. **FastAPI Application and Database Pooling**
   I initialized the FastAPI application and configured a robust database connection pool using SQLAlchemy. I set up specific parameters like pool_size and pool_pre_ping to ensure the server can handle multiple requests efficiently without dropping connections. I also added CORS middleware for security and created a /health endpoint to verify the API and database status.

9. **Dashboard Analytics Endpoints**
   To feed data to the frontend dashboard, I built several API routes. I maintained strict module separation by creating dedicated routers for analytics, modules, and students. I wrote optimized SQLAlchemy queries using database aggregations (func.avg, func.count) to calculate global statistics, identify at-risk students (average < 10 or absences > 3), and analyze module difficulty. I also used Pydantic schemas to validate and serialize the JSON responses properly.

10. **Machine Learning: Automatic Segmentation (Bonus B)**
    I successfully completed the expert challenge for student segmentation. I wrote a Python script using the scikit-learn library to apply a K-Means clustering algorithm. First, I extracted and standardized the students' average grades and total absences. Then, the algorithm automatically grouped the students into three distinct behavioral profiles (Excellent, Regular, and At-Risk). I exposed this logic through a new /api/v1/ml/segmentation endpoint.

11. **Machine Learning: Predictive Risk Model (Bonus A)**
    For the final backend feature, I built a predictive model to estimate the probability of a student failing. I trained a Random Forest Classifier using historical behavioral data. To prevent target leakage, I specifically used total absences and evaluation participation as my features rather than the current grades. I exposed this model via an API endpoint (/api/v1/ml/predict/{student_id}) that returns the calculated failure probability and a boolean risk alert for any specific student.

12. **Authentication, RBAC, and Data Import**
    To secure the platform, I built an authentication system using JWT and Bcrypt. I added an email service for optional Two-Factor Authentication (2FA), password resets, and user invites. I also created a Role-Based Access Control (RBAC) system so that Admins, Managers, Teachers, and Students can only access data allowed for their specific role. Finally, I developed a secure endpoint for staff to upload CSV files, completing the main backend setup.

    **_Technical Issues I Conquered:_**

Bcrypt Version Error: I got a password hashing error due to a library conflict. I fixed this by installing an older, compatible version of the bcrypt library.

Database ID Conflict: When I tried to add test users, the database threw an error because the ID numbers were out of order. I solved this by completely resetting the database and running fresh migrations.

Swagger UI Problems: FastAPI's default login popup didn't work with my custom 2FA setup. I fixed this by updating the endpoints and using a simple "Bearer token" box in the Swagger documentation instead.

2FA Login Flow: It was difficult to pause the login process to wait for the 2FA email code. I solved this by splitting the login into two clear steps (/login and /verify-2fa) and safely saving the temporary codes in the database.
