# EduTrack Analytics : Plateforme d’Analyse de Performance des Étudiants

---

- **Auteur :** Ahmed El Marrouni
- **Institution :** Ynov Campus (2025-2026)
- **Classe :** B3 - AI & Data Engineering
- **Module :** Project Specialization

## Technical Documentation

## System Architecture & Documentation

Explore the project details and visual documentation below:

|   **Data Engineering**    | **Backend Architecture** |   **Data Science Notebook**   |
| :-----------------------: | :----------------------: | :---------------------------: |
| [View Docs](docs/DATA.md) | [View Docs](docs/BE.md)  | [View Docs](docs/NOTEBOOK.md) |

### Visual Schemas

_Click on an image to view in full resolution._

| **ETL Pipeline**                                        | **Database Schema**                      | **Project Tree**                                    |
| ------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| [View Diagram](./diagrams/ETL-Architecture-Diagram.svg) | [View Diagram](./diagrams/DB-Schema.svg) | [View Diagram](./diagrams//ProjectTree-diagram.svg) |

---

# Getting Started

## 1. Local Development

To run the application locally, you need to start the backend, frontend, and Jupyter environment in separate terminal sessions.

**Backend API:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

```

**Frontend Application:**

```bash
cd frontend
npm install
npm run dev

```

**Data Science Notebooks:**
Run the following command in the project root directory:

```bash
jupyter lab

```

## 2. Docker Deployment

For a containerized environment, use the provided Docker Compose configuration to launch all services simultaneously:

```bash
docker-compose up --build

```

- **Backend:** `http://localhost:8000`
- **Frontend:** `http://localhost:3000`
- **Jupyter Lab:** `http://localhost:8889` (Token: `edutrack_secret`)

---

## Data Management & Seeding

### Data Generation

Run the generation script to create synthetic academic datasets (students, grades, attendance). This script simulates realistic academic correlations, such as the impact of truancy on final grades:

```bash
python3 -m app.etl.generate_data

```

### Database Seeding

To reset the database and populate it with the generated CSV files while maintaining relational integrity (Foreign Keys), execute:

```bash
python3 -m app.etl.seed_database

```

### Test Accounts

After seeding the database, you can log in using the following test credentials:

| Role        | Email                             | Password      |
| ----------- | --------------------------------- | ------------- |
| **Admin**   | `ahmedelmarrouni1@gmail.com`      | `password123` |
| **Manager** | `ahmed.elmarrouni@ynov.com`       | `password123` |
| **Teacher** | `elmarrouni.ahmed@cyberground.ma` | `password123` |
| **Student** | `aelmarrouni@lapelota.ma`         | `password123` |

To seed these specific users manually, use:

```bash
python3 scripts/seed_test_users.py

```

_Project developed for the Ynov Campus Specialization Project (2025-2026)._
