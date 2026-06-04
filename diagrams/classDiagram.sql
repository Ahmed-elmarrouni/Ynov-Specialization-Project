-- ==========================================
-- EduTrack Analytics - Refined Enterprise Schema
-- ==========================================

-- ------------------------------------------
-- 1. SYSTEM & ACCESS (RBAC)
-- ------------------------------------------
Table users {
  id int [primary key, increment]
  first_name varchar
  last_name varchar
  email varchar [unique, not null]
  phone_number varchar 
  password_hash varchar [not null]
  role varchar ['admin, teacher, pedagogical_manager, student']
  last_login datetime
  created_at datetime
  updated_at datetime
}

-- ------------------------------------------
-- 2. CORE ENTITIES (STUDENTS & TEACHERS)
-- ------------------------------------------
Table students {
  id int [primary key, increment]
  user_id int [ref: - users.id, 1-to-1']
  student_id_number varchar [unique, 'The real-world matricule / badge number']
  birth_date date
  cohort_id int [ref: > cohorts.id]
  enrollment_status varchar ['ACTIVE, SUSPENDED, DROPPED']
  created_at datetime
}

Table teachers {
  id int [primary key, increment] 
  user_id int [ref: - users.id, 1-to-1']
  specialty varchar
}

Table data_imports {
  id int [primary key, increment]
  uploaded_by int [ref: > users.id]
  file_name varchar
  file_type varchar [note: 'CSV, EXCEL, PDF']
  total_rows int
  success_rows int
  error_rows int
  status varchar ['PENDING, SUCCESS, FAILED']
  error_log json ['Stores specific row errors']
  created_at datetime
}

-- ------------------------------------------
-- 2. ACADEMIC STRUCTURE
-- ------------------------------------------
Table academic_years {
  id int [primary key, increment]
  name varchar ['e.g., 2025-2026']
  start_date date
  end_date date
  is_current boolean
}

Table programs {
  id int [primary key, increment]
  name varchar ['e.g., Data & IA, DevOps, Tech & Business, 3D/Jeux Vidéo'] 
  department varchar
  degree_level varchar ['B1, B2, B3, M1, M2'] 
  schedule_type varchar/boolean ['Cours du jour, Cours du soir']
}

Table cohorts {
  id int [primary key, increment]
  program_id int [ref: > programs.id]
  academic_year_id int [ref: > academic_years.id]
  name varchar ['e.g., B3 Data & IA - G1']
}

-- ------------------------------------------
-- 4. CURRICULUM & SCHEDULING
-- ------------------------------------------
Table modules {
  id int [primary key, increment]
  code varchar [unique,'e.g., DATA-301']
  name varchar
  credits int
  description text
  created_at datetime
  updated_at datetime
}

Table cohort_modules {
  id int [primary key, increment]
  module_id int [ref: > modules.id]
  cohort_id int [ref: > cohorts.id]
  teacher_id int [ref: > teachers.id]
  total_hours int
}

Table scheduled_sessions {
  id int [primary key, increment]
  cohort_module_id int [ref: > cohort_modules.id]
  session_date date
  start_time time
  end_time time
  room varchar -- Could be a physical room or virtual link
  type varchar ['Lecture, TD, TP']
}

-- ------------------------------------------
-- 5. EVALUATIONS & GRADES (TRANSACTIONAL)
-- ------------------------------------------
Table evaluations {
  id int [primary key, increment]
  cohort_module_id int [ref: > cohort_modules.id]
  title varchar ['e.g., Midterm Python, Q1 Quiz'] 
  type varchar ['Exam, Quiz, Project, Presentation (Stored as comma-separated or JSON array)'] 
  weight_percentage float ['The coefficient (e.g., 30 for 30% of the final grade)'] 
  max_score float [default: 20.0, note: 'Allows exams to be graded out of 10, 20, 100']
  evaluation_date date
}

Table grades {
  id int [primary key, increment]
  evaluation_id int [ref: > evaluations.id]
  student_id int [ref: > students.id]
  score float
  is_absent boolean [default: false]
  comments text
  graded_at datetime
}

-- ------------------------------------------
-- 6. ATTENDANCE (TRANSACTIONAL)
-- ------------------------------------------
Table attendance_records {
  id int [primary key, increment]
  session_id int [ref: > scheduled_sessions.id]
  student_id int [ref: > students.id]
  status varchar [note: 'PRESENT, ABSENT, LATE']
  minutes_late int [note: 'Only if status is LATE']
  is_justified boolean [default: false]
  justification_reason text
  recorded_at datetime
}