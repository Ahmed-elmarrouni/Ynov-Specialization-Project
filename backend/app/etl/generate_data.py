import pandas as pd
import random
import os
from faker import Faker
from datetime import datetime, timedelta

# Faker Initializiation
fake = Faker("fr_FR")
output_dir = "/Users/ahmed/Ynov/Specialization Project/data"
os.makedirs(output_dir, exist_ok=True)

print("Starting Enterprise Data Generation...")

# 1. Academic Structure
academic_years = pd.DataFrame(
    [
        {
            "id": 1,
            "name": "2025-2026",
            "start_date": "2025-09-01",
            "end_date": "2026-06-30",
            "is_current": True,
        }
    ]
)

programs = pd.DataFrame(
    [
        {
            "id": 1,
            "name": "B3 Data & IA",
            "department": "Tech",
            "degree_level": "B3",
            "schedule_type": "Cours du jour",
        },
        {
            "id": 2,
            "name": "B3 DevOps",
            "department": "Tech",
            "degree_level": "B3",
            "schedule_type": "Cours du jour",
        },
        {
            "id": 3,
            "name": "M1 Tech & Business",
            "department": "Business",
            "degree_level": "M1",
            "schedule_type": "Cours du soir",
        },
    ]
)

cohorts = pd.DataFrame(
    [
        {"id": 1, "program_id": 1, "academic_year_id": 1, "name": "B3 Data & IA - G1"},
        {"id": 2, "program_id": 2, "academic_year_id": 1, "name": "B3 DevOps - G1"},
        {
            "id": 3,
            "program_id": 3,
            "academic_year_id": 1,
            "name": "M1 Tech & Biz - Soir",
        },
    ]
)

modules = pd.DataFrame(
    [
        {
            "id": 1,
            "code": "DATA-301",
            "name": "Machine Learning Fundamentals",
            "credits": 5,
            "description": "Intro to ML",
        },
        {
            "id": 2,
            "code": "DATA-302",
            "name": "Advanced Python for Data",
            "credits": 4,
            "description": "Pandas, NumPy",
        },
        {
            "id": 3,
            "code": "DEV-301",
            "name": "Go Microservices",
            "credits": 5,
            "description": "Backend architecture",
        },
        {
            "id": 4,
            "code": "SYS-301",
            "name": "Cloud Infrastructure",
            "credits": 4,
            "description": "AWS & Docker",
        },
    ]
)

# 2. users, teachers, & students
num_students = 1000
num_teachers = 15
num_admins = 5
total_users = num_students + num_teachers + num_admins

users_data = []
for i in range(1, total_users + 1):
    role = (
        "student"
        if i <= num_students
        else ("teacher" if i <= num_students + num_teachers else "admin")
    )
    users_data.append(
        {
            "id": i,
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.unique.email(),
            "phone_number": fake.phone_number(),
            "password_hash": "pbkdf2:sha256:50000$dummyhash",
            "role": role,
            "created_at": datetime.now(),
        }
    )
users = pd.DataFrame(users_data)

teachers_data = []
for i, user in users[users["role"] == "teacher"].iterrows():
    teachers_data.append(
        {
            "id": len(teachers_data) + 1,
            "user_id": user["id"],
            "specialty": random.choice(
                ["Data Science", "Backend", "Cloud Ops", "Mathematics"]
            ),
        }
    )
teachers = pd.DataFrame(teachers_data)

students_data = []
student_traits = {}
for i, user in users[users["role"] == "student"].iterrows():
    s_id = len(students_data) + 1
    cohort_id = random.choice([1, 2, 3])
    students_data.append(
        {
            "id": s_id,
            "user_id": user["id"],
            "student_id_number": f"STU-{100000 + s_id}",
            "birth_date": fake.date_of_birth(minimum_age=18, maximum_age=25),
            "cohort_id": cohort_id,
            "enrollment_status": random.choices(
                ["ACTIVE", "SUSPENDED", "DROPPED"], weights=[90, 5, 5]
            )[0],
            "created_at": datetime.now(),
        }
    )
    student_traits[s_id] = {
        "aptitude": random.uniform(8, 16),
        "truancy": random.uniform(0.01, 0.15),
    }
students = pd.DataFrame(students_data)

# 3. scheduling & curriculum
cohort_modules_data = []
cm_id = 1
for c_id in cohorts["id"]:
    for m_id in modules["id"]:
        cohort_modules_data.append(
            {
                "id": cm_id,
                "module_id": m_id,
                "cohort_id": c_id,
                "teacher_id": random.choice(teachers["id"]),
                "total_hours": random.choice([20, 30, 40]),
            }
        )
        cm_id += 1
cohort_modules = pd.DataFrame(cohort_modules_data)

evaluations_data = []
eval_id = 1
for cm in cohort_modules_data:
    evaluations_data.append(
        {
            "id": eval_id,
            "cohort_module_id": cm["id"],
            "title": "Midterm Exam",
            "type": "Exam",
            "weight_percentage": 40.0,
            "max_score": 20.0,
            "evaluation_date": "2025-11-15",
        }
    )
    eval_id += 1
    evaluations_data.append(
        {
            "id": eval_id,
            "cohort_module_id": cm["id"],
            "title": "Final Project",
            "type": "Project",
            "weight_percentage": 60.0,
            "max_score": 20.0,
            "evaluation_date": "2026-01-20",
        }
    )
    eval_id += 1
evaluations = pd.DataFrame(evaluations_data)

# 4. grades
grades_data = []
g_id = 1
for eval_record in evaluations_data:
    c_mod = next(
        item
        for item in cohort_modules_data
        if item["id"] == eval_record["cohort_module_id"]
    )
    c_id = c_mod["cohort_id"]

    cohort_students = students[students["cohort_id"] == c_id]

    for _, student in cohort_students.iterrows():
        s_id = student["id"]
        traits = student_traits[s_id]

        is_absent = random.random() < traits["truancy"]

        if is_absent:
            score = 0.0
        else:
            variance = random.uniform(-3, 3)
            score = round(traits["aptitude"] + variance, 2)
            score = max(0.0, min(20.0, score))

        grades_data.append(
            {
                "id": g_id,
                "evaluation_id": eval_record["id"],
                "student_id": s_id,
                "score": score,
                "is_absent": is_absent,
                "comments": "Absent" if is_absent else "",
                "graded_at": datetime.now(),
            }
        )
        g_id += 1
grades = pd.DataFrame(grades_data)

# 5. export to CSV
datasets = {
    "academic_years": academic_years,
    "programs": programs,
    "cohorts": cohorts,
    "modules": modules,
    "users": users,
    "teachers": teachers,
    "students": students,
    "cohort_modules": cohort_modules,
    "evaluations": evaluations,
    "grades": grades,
}

for name, df in datasets.items():
    file_path = os.path.join(output_dir, f"{name}.csv")
    df.to_csv(file_path, index=False)
    print(f"Generated {file_path} ({len(df)} rows)")

print("\nData generation complete! All CSVs are ready for your pipeline.")
