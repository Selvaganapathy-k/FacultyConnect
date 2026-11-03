import os
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./facultyconnect.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-this-secret-before-deployment")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 8
BOOTSTRAP_ADMIN_EMAIL = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@facultyconnect.local")
BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "ChangeMe123!")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
