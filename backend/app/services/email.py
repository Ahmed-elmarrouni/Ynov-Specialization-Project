import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    @staticmethod
    def send_email(subject: str, recipient: str, body: str):
        host = os.getenv("SMTP_HOST")
        port = int(os.getenv("SMTP_PORT", 587))
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASSWORD")
        sender = os.getenv("SMTP_FROM_EMAIL")

        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = recipient
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        try:
            print(f"Attempting to send email to {recipient} via {host}...")
            with smtplib.SMTP(host, port) as server:
                server.set_debuglevel(1)
                server.starttls()
                print("Logging in...")
                server.login(user, password)
                print("Sending message...")
                server.send_message(msg)
                print("Email sent successfully!")
        except Exception as e:
            print(f"CRITICAL SMTP ERROR: {e}")

    @staticmethod
    def send_2fa_code(email: str, code: str):
        subject = "EduTrack - Your Verification Code"
        body = f"Your 2FA code is: <b>{code}</b>. It expires in 10 minutes."
        EmailService.send_email(subject, email, body)

    @staticmethod
    def send_invitation(email: str, token: str, role: str):
        subject = "Invitation to EduTrack Analytics"
        link = f"http://localhost:5173/complete-profile?token={token}"
        body = f"You have been invited as a {role}. Click here to set up your account: <a href='{link}'>{link}</a>"
        EmailService.send_email(subject, email, body)
