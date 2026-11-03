from datetime import date, time
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class RegisterInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class StatusInput(BaseModel):
    status: str
    note: Optional[str] = None

class StaffCreate(BaseModel):
    name: str
    department: str
    designation: str
    email: EmailStr
    phone: Optional[str] = None
    room_id: Optional[int] = None
    account_password: str = Field(min_length=8, max_length=72)

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    room_id: Optional[int] = None
    is_active: Optional[bool] = None

class RoomInput(BaseModel):
    building: str
    floor: str
    room_number: str
    room_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ScheduleInput(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    activity: str = "Office Hours"
    room_id: Optional[int] = None

class AppointmentInput(BaseModel):
    staff_id: int
    requested_date: date
    requested_time: time
    purpose: str = Field(min_length=3, max_length=500)

class AppointmentStatus(BaseModel):
    status: str
