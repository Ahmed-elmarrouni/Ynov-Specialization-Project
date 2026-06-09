from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.core.database import get_db
from app.models.student import Student
from app.models.system import User
from app.models.academic import Grade, AttendanceRecord
from app.core import security

router = APIRouter()

@router.get("/download", response_class=HTMLResponse)
def download_report(
    current_user: User = Depends(security.RequireRole(["admin", "pedagogical_manager"])),
    db: Session = Depends(get_db)
):
    """
    Generates a professional HTML report of the pedagogical KPIs and at-risk students.
    Includes dynamic Chart.js visualizations for the executive summary.
    """
    #  Global Stats
    total_students = db.query(func.count(Student.id)).scalar() or 0
    overall_average = db.query(func.avg(Grade.score)).filter(Grade.is_absent == False).scalar() or 0.0

    # Calculate Pass Rate  >= 10)
    student_avgs = db.query(Grade.student_id, func.avg(Grade.score).label("avg")).filter(Grade.is_absent == False).group_by(Grade.student_id).subquery()
    passing_students = db.query(func.count(student_avgs.c.student_id)).filter(student_avgs.c.avg >= 10.0).scalar() or 0
    pass_rate = (passing_students / total_students * 100) if total_students > 0 else 0.0
    failing_students = total_students - passing_students

    absence_sub = db.query(AttendanceRecord.student_id, func.count(AttendanceRecord.id).label("abs_count")).filter(AttendanceRecord.status == "Absent").group_by(AttendanceRecord.student_id).subquery()

    results = db.query(
        Student.id, User.first_name, User.last_name,
        func.coalesce(student_avgs.c.avg, 0.0).label("avg"),
        func.coalesce(absence_sub.c.abs_count, 0).label("abs")
    ).join(User, Student.user_id == User.id)\
     .outerjoin(student_avgs, Student.id == student_avgs.c.student_id)\
     .outerjoin(absence_sub, Student.id == absence_sub.c.student_id)\
     .filter((student_avgs.c.avg < 10.0) | (absence_sub.c.abs_count > 3)).all()

    #  HTML Table Rows
    at_risk_rows = ""
    for r in results:
        if r.avg < 10 and r.abs > 3:
            rec = "<span class='badge badge-critical'>Urgent Meeting & Probation</span>"
        elif r.avg < 10:
            rec = "<span class='badge badge-warning'>Peer-tutoring Recommended</span>"
        else:
            rec = "<span class='badge badge-info'>Send Attendance Warning</span>"
            
        at_risk_rows += f"""
            <tr>
                <td><strong>{r.first_name} {r.last_name}</strong></td>
                <td class="{'text-error font-bold' if r.avg < 10 else ''}">{round(r.avg, 2)} / 20</td>
                <td class="{'text-error font-bold' if r.abs > 3 else ''}">{r.abs}</td>
                <td>{rec}</td>
            </tr>
        """

    if not at_risk_rows:
        at_risk_rows = "<tr><td colspan='4' style='text-align: center; padding: 30px; color: #94a3b8;'>No at-risk students found. Excellent cohort health.</td></tr>"

    timestamp = datetime.now().strftime("%B %d, %Y at %H:%M")

    # Chart.js
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>EduTrack - Global Pedagogical Report</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            :root {{
                --primary: #00babc;
                --primary-light: rgba(0, 186, 188, 0.1);
                --secondary: #1e293b;
                --text-main: #334155;
                --text-muted: #64748b;
                --bg-main: #f8fafc;
                --error: #ef4444;
                --warning: #f59e0b;
                --success: #10b981;
            }}
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text-main); margin: 0; padding: 40px; background-color: var(--bg-main); }}
            .report-container {{ max-width: 1000px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
            
            /* Header */
            .header {{ display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid var(--primary); padding-bottom: 20px; margin-bottom: 30px; }}
            .header-titles h1 {{ color: var(--secondary); margin: 0 0 5px 0; font-size: 28px; letter-spacing: -0.5px; }}
            .header-titles p {{ margin: 0; color: var(--text-muted); font-size: 14px; }}
            .header-meta text-align: right; color: var(--text-muted); font-size: 12px; }}
            .header-meta strong {{ color: var(--secondary); }}

            /* Layout Grid */
            .executive-summary {{ display: flex; gap: 30px; margin-bottom: 40px; }}
            
            /* KPIs */
            .kpi-column {{ flex: 1; display: flex; flex-direction: column; gap: 15px; }}
            .kpi-card {{ background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid var(--primary); border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
            .kpi-value {{ font-size: 28px; font-weight: 800; color: var(--secondary); margin-bottom: 4px; }}
            .kpi-label {{ font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }}
            
            /* Chart */
            .chart-column {{ flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
            .chart-title {{ font-size: 14px; font-weight: 600; color: var(--secondary); margin-bottom: 10px; width: 100%; text-align: left; }}
            .chart-container {{ position: relative; height: 200px; width: 100%; }}

            /* Tables */
            h2 {{ color: var(--secondary); margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }}
            th, td {{ padding: 16px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
            th {{ background-color: var(--bg-main); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }}
            tr:last-child td {{ border-bottom: none; }}
            
            /* Badges & Utilities */
            .badge {{ padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }}
            .badge-critical {{ background: rgba(239, 68, 68, 0.1); color: var(--error); border: 1px solid rgba(239, 68, 68, 0.2); }}
            .badge-warning {{ background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); }}
            .badge-info {{ background: rgba(0, 186, 188, 0.1); color: var(--primary); border: 1px solid rgba(0, 186, 188, 0.2); }}
            .text-error {{ color: var(--error); }}
            .font-bold {{ font-weight: bold; }}
            
            .footer {{ margin-top: 50px; text-align: center; font-size: 12px; color: var(--text-muted); border-top: 1px solid #e2e8f0; padding-top: 20px; }}

            /* Print Optimizations */
            @media print {{
                body {{ background-color: #fff; padding: 0; }}
                .report-container {{ box-shadow: none; padding: 0; max-width: 100%; }}
                .kpi-card {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
                .badge {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
            }}
        </style>
    </head>
    <body>
        <div class="report-container">
            <div class="header">
                <div class="header-titles">
                    <h1>Global Pedagogical Report</h1>
                    <p>EduTrack Analytics Enterprise</p>
                </div>
                <div class="header-meta">
                    Generated on <strong>{timestamp}</strong><br>
                    Prepared by <strong>{current_user.first_name} {current_user.last_name} ({current_user.role.upper()})</strong>
                </div>
            </div>
            
            <div class="executive-summary">
                <div class="kpi-column">
                    <div class="kpi-card">
                        <div class="kpi-value">{total_students}</div>
                        <div class="kpi-label">Total Enrolled Students</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">{round(overall_average, 2)} <span style="font-size:16px; color:#64748b;">/ 20</span></div>
                        <div class="kpi-label">School-Wide Average</div>
                    </div>
                </div>
                <div class="chart-column">
                    <div class="chart-title">Cohort Health Distribution</div>
                    <div class="chart-container">
                        <canvas id="healthChart"></canvas>
                    </div>
                </div>
            </div>

            <h2>Students Requiring Pedagogical Intervention</h2>
            <table>
                <thead>
                    <tr>
                        <th>Student Profile</th>
                        <th>Avg Grade</th>
                        <th>Absences</th>
                        <th>Actionable Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    {at_risk_rows}
                </tbody>
            </table>
            
            <div class="footer">
                EduTrack Analytics Platform • Confidential & Internal Use Only
            </div>
        </div>

        <script>
            const ctx = document.getElementById('healthChart').getContext('2d');
            new Chart(ctx, {{
                type: 'doughnut',
                data: {{
                    labels: ['Passing (>= 10)', 'Failing (< 10)'],
                    datasets: [{{
                        data: [{passing_students}, {failing_students}],
                        backgroundColor: ['#00babc', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {{
                        legend: {{ position: 'right', labels: {{ usePointStyle: true, boxWidth: 8, font: {{ size: 11, family: "'Inter', sans-serif" }} }} }}
                    }}
                }}
            }});
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)