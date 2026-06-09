import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from app.models.student import Student
from app.models.academic import Grade, AttendanceRecord


def segment_students(db: Session):
    """
    Groups students into 3 clusters (Excellent, Regular, At-Risk)
    based on average grades and total absences.
    """
    # Data Extraction
    grades_query = (
        db.query(Grade.student_id, func.avg(Grade.score).label("avg_grade"))
        .filter(Grade.is_absent == False)
        .group_by(Grade.student_id)
        .all()
    )

    absences_query = (
        db.query(
            AttendanceRecord.student_id,
            func.count(AttendanceRecord.id).label("total_absences"),
        )
        .filter(AttendanceRecord.status == "Absent")
        .group_by(AttendanceRecord.student_id)
        .all()
    )

    # Convert to DataFrames
    df_grades = pd.DataFrame(grades_query, columns=["student_id", "avg_grade"])
    df_absences = pd.DataFrame(absences_query, columns=["student_id", "total_absences"])

    # Merge and handle missing values
    df = pd.merge(df_grades, df_absences, on="student_id", how="outer").fillna(0)

    if len(df) < 3:
        return {int(sid): "Insufficient Data" for sid in df["student_id"]}

    # 2nd  Preprocessing
    scaler = StandardScaler()
    features = ["avg_grade", "total_absences"]
    scaled_data = scaler.fit_transform(df[features])

    #  K-Means Clustering
    kmeans = KMeans(n_clusters=3, n_init=10, random_state=42)
    df["cluster"] = kmeans.fit_predict(scaled_data)

    #  Cluster Naming Logic based on Grade Performance
    cluster_means = (
        df.groupby("cluster")["avg_grade"].mean().sort_values(ascending=False)
    )

    names = ["Excellent", "Regular", "At-Risk"]
    cluster_name_map = {
        cluster_id: names[i] for i, cluster_id in enumerate(cluster_means.index)
    }

    df["cluster_name"] = df["cluster"].map(cluster_name_map)

    return dict(zip(df["student_id"].astype(int), df["cluster_name"]))
