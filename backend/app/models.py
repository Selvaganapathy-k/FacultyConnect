from datetime import datetime, date, time, timezone
from typing import Optional
from sqlmodel import SQLModel, Field
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(default="student", index=True)
    staff_id: Optional[int] = Field(default=None, foreign_key="staff.id")
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Room(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    building: str
    floor: str
    room_number: str
    room_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Staff(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    department: str
    designation: str
    email: str = Field(index=True, unique=True)
    phone: Optional[str] = None
    room_id: Optional[int] = Field(default=None, foreign_key="room.id")
    is_active: bool = True

class Schedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="staff.id", index=True)
    day_of_week: int
    start_time: time
    end_time: time
    activity: str = "Office Hours"
    room_id: Optional[int] = Field(default=None, foreign_key="room.id")

class StaffStatus(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="staff.id", index=True)
    status: str = "Available"
    note: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Appointment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="staff.id", index=True)
    student_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    student_name: str
    student_email: str
    requested_date: date
    requested_time: time
    purpose: str
    status: str = "Pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
