import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

from app.models.academic import Grade, AttendanceRecord

def predict_student_risk(student_id: int, db: Session):
    """
    Trains a Random Forest model on current student data and predicts 
    the risk of failure (average < 10) for a specific student.
    """
    # Data Extraction
    grades_query = db.query(
        Grade.student_id,
        func.avg(Grade.score).label("avg_grade"),
        func.count(Grade.id).label("grade_count")
    ).filter(Grade.is_absent == False).group_by(Grade.student_id).all()

    absences_query = db.query(
        AttendanceRecord.student_id,
        func.count(AttendanceRecord.id).label("total_absences")
    ).filter(AttendanceRecord.status == "Absent").group_by(AttendanceRecord.student_id).all()

    df_grades = pd.DataFrame(grades_query, columns=["student_id", "avg_grade", "grade_count"])
    df_absences = pd.DataFrame(absences_query, columns=["student_id", "total_absences"])
    df = pd.merge(df_grades, df_absences, on="student_id", how="outer").fillna(0)

    if df.empty or len(df) < 5:
        return 0.0, False

    #  Labeling and Feature Selection
    df["target"] = (df["avg_grade"] < 10.0).astype(int)
    features = ["total_absences", "grade_count"]
    X = df[features]
    y = df["target"]

    # Preprocessing and Training
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_scaled, y)

    # Prediction
    student_data = df[df["student_id"] == student_id]
    if student_data.empty:
        return 0.0, False

    X_test = scaler.transform(student_data[features])
    probability = model.predict_proba(X_test)[0][1]
    is_at_risk = bool(model.predict(X_test)[0])

    return float(probability), is_at_risk
