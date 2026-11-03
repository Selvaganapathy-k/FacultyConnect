from datetime import datetime, timezone
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect
)
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from .database import create_db_and_tables, get_session, engine
from .models import User, Staff, Room, Schedule, StaffStatus, Appointment
from .schemas import RegisterInput, LoginInput, StatusInput, StaffCreate, StaffUpdate, RoomInput, ScheduleInput, AppointmentInput, AppointmentStatus
from .security import hash_password, verify_password, create_access_token, get_current_user, require_roles
from .config import BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, FRONTEND_ORIGIN
from .realtime import manager

app = FastAPI(title="FacultyConnect API", version="2.0.0", description="Staff availability, schedule and room locator")
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    create_db_and_tables()
    with Session(engine) as session:
        admin = session.exec(select(User).where(User.email == BOOTSTRAP_ADMIN_EMAIL.lower())).first()
        if not admin:
            session.add(User(full_name="System Administrator", email=BOOTSTRAP_ADMIN_EMAIL.lower(), password_hash=hash_password(BOOTSTRAP_ADMIN_PASSWORD), role="admin"))
            session.commit()

@app.get("/")
def root():
    return {"message":"FacultyConnect API is running", "version":"2.0.0"}

@app.get("/api/health")
def health():
    return {"status":"ok"}

@app.post("/api/auth/register")
def register(payload: RegisterInput, session: Session = Depends(get_session)):
    email=payload.email.lower()
    if session.exec(select(User).where(User.email==email)).first():
        raise HTTPException(409, "An account with this email already exists")
    user=User(full_name=payload.full_name, email=email, password_hash=hash_password(payload.password), role="student")
    session.add(user); session.commit(); session.refresh(user)
    return {"access_token":create_access_token(user), "token_type":"bearer", "user":{"id":user.id,"full_name":user.full_name,"email":user.email,"role":user.role}}

@app.post("/api/auth/login")
def login(payload: LoginInput, session: Session = Depends(get_session)):
    user=session.exec(select(User).where(User.email==payload.email.lower())).first()
    if not user or not verify_password(payload.password, user.password_hash) or not user.is_active:
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token":create_access_token(user), "token_type":"bearer", "user":{"id":user.id,"full_name":user.full_name,"email":user.email,"role":user.role,"staff_id":user.staff_id}}
@app.post("/api/auth/token")
def swagger_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    email = form_data.username.lower()

    user = session.exec(
        select(User).where(User.email == email)
    ).first()

    if (
        not user
        or not verify_password(form_data.password, user.password_hash)
        or not user.is_active
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer"
    }

@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)):
    return {"id":user.id,"full_name":user.full_name,"email":user.email,"role":user.role,"staff_id":user.staff_id}

@app.get("/api/staff")
def list_staff(search: str="", department: str="", session: Session=Depends(get_session)):
    people=session.exec(select(Staff).where(Staff.is_active==True)).all()
    output=[]
    for p in people:
        if search and search.lower() not in f"{p.name} {p.email} {p.department} {p.designation}".lower(): continue
        if department and department.lower()!=p.department.lower(): continue
        status=session.exec(select(StaffStatus).where(StaffStatus.staff_id==p.id).order_by(StaffStatus.updated_at.desc())).first()
        room=session.get(Room,p.room_id) if p.room_id else None
        output.append({"id":p.id,"name":p.name,"department":p.department,"designation":p.designation,"email":p.email,"status":status.status if status else "Unknown","status_note":status.note if status else None,"status_updated_at":status.updated_at.isoformat() if status else None,"room":room.model_dump() if room else None})
    return output

@app.get("/api/staff/{staff_id}")
def staff_detail(staff_id:int, session:Session=Depends(get_session)):
    p=session.get(Staff,staff_id)
    if not p: raise HTTPException(404,"Staff member not found")
    status=session.exec(select(StaffStatus).where(StaffStatus.staff_id==staff_id).order_by(StaffStatus.updated_at.desc())).first()
    room=session.get(Room,p.room_id) if p.room_id else None
    schedules=session.exec(select(Schedule).where(Schedule.staff_id==staff_id).order_by(Schedule.day_of_week,Schedule.start_time)).all()
    return {"id":p.id,"name":p.name,"department":p.department,"designation":p.designation,"email":p.email,"status":status.status if status else "Unknown","status_note":status.note if status else None,"room":room.model_dump() if room else None,"schedule":[s.model_dump(mode="json") for s in schedules]}

@app.post("/api/staff/{staff_id}/status")
async def update_status(staff_id:int, payload:StatusInput, user:User=Depends(get_current_user), session:Session=Depends(get_session)):
    allowed={"Available","Busy","In Class","On Leave"}
    if payload.status not in allowed: raise HTTPException(400,"Invalid status")
    person=session.get(Staff,staff_id)
    if not person: raise HTTPException(404,"Staff member not found")
    if user.role!="admin" and not (user.role=="staff" and user.staff_id==staff_id):
        raise HTTPException(403,"You can update only your own staff status")
    item=StaffStatus(staff_id=staff_id,status=payload.status,note=payload.note)
    session.add(item); session.commit(); session.refresh(item)
    await manager.broadcast({"type":"status_updated","staff_id":staff_id,"status":item.status,"note":item.note})
    return {"message":"Status updated","status":item.status,"updated_at":item.updated_at}

@app.get("/api/staff/{staff_id}/schedule")
def get_schedule(staff_id:int, session:Session=Depends(get_session)):
    if not session.get(Staff,staff_id): raise HTTPException(404,"Staff member not found")
    return session.exec(select(Schedule).where(Schedule.staff_id==staff_id).order_by(Schedule.day_of_week,Schedule.start_time)).all()

@app.post("/api/staff/{staff_id}/schedule")
async def add_schedule(staff_id:int,payload:ScheduleInput,user:User=Depends(require_roles("staff","admin")),session:Session=Depends(get_session)):
    if not session.get(Staff,staff_id): raise HTTPException(404,"Staff member not found")
    if user.role=="staff" and user.staff_id!=staff_id: raise HTTPException(403,"You can manage only your own schedule")
    if payload.end_time<=payload.start_time: raise HTTPException(400,"End time must be after start time")
    if payload.room_id and not session.get(Room,payload.room_id): raise HTTPException(404,"Room not found")
    overlaps=session.exec(select(Schedule).where(Schedule.staff_id==staff_id,Schedule.day_of_week==payload.day_of_week)).all()
    for s in overlaps:
        if payload.start_time<s.end_time and payload.end_time>s.start_time: raise HTTPException(409,"This schedule overlaps an existing entry")
    item=Schedule(staff_id=staff_id,**payload.model_dump()); session.add(item); session.commit(); session.refresh(item)
    await manager.broadcast({"type":"schedule_updated","staff_id":staff_id})
    return item

@app.delete("/api/schedule/{schedule_id}")
async def delete_schedule(schedule_id:int,user:User=Depends(require_roles("staff","admin")),session:Session=Depends(get_session)):
    item=session.get(Schedule,schedule_id)
    if not item: raise HTTPException(404,"Schedule not found")
    if user.role=="staff" and user.staff_id!=item.staff_id: raise HTTPException(403,"You can manage only your own schedule")
    session.delete(item);session.commit()
    await manager.broadcast({"type":"schedule_updated","staff_id":item.staff_id})
    return {"message":"Schedule deleted"}

@app.get("/api/rooms")
def rooms(session:Session=Depends(get_session)):
    return session.exec(select(Room)).all()

@app.post("/api/admin/rooms")
def create_room(payload:RoomInput,user:User=Depends(require_roles("admin")),session:Session=Depends(get_session)):
    room=Room(**payload.model_dump());session.add(room);session.commit();session.refresh(room);return room

@app.post("/api/admin/staff")
def create_staff(payload:StaffCreate,user:User=Depends(require_roles("admin")),session:Session=Depends(get_session)):
    email=payload.email.lower()
    if session.exec(select(Staff).where(Staff.email==email)).first() or session.exec(select(User).where(User.email==email)).first():
        raise HTTPException(409,"Email already exists")
    if payload.room_id and not session.get(Room,payload.room_id): raise HTTPException(404,"Room not found")
    person=Staff(name=payload.name,department=payload.department,designation=payload.designation,email=email,phone=payload.phone,room_id=payload.room_id)
    session.add(person);session.commit();session.refresh(person)
    account=User(full_name=person.name,email=email,password_hash=hash_password(payload.account_password),role="staff",staff_id=person.id)
    session.add(account);session.commit()
    return {"message":"Staff member and login created","staff_id":person.id}

@app.patch("/api/admin/staff/{staff_id}")
def edit_staff(staff_id:int,payload:StaffUpdate,user:User=Depends(require_roles("admin")),session:Session=Depends(get_session)):
    p=session.get(Staff,staff_id)
    if not p: raise HTTPException(404,"Staff not found")
    for k,v in payload.model_dump(exclude_unset=True).items(): setattr(p,k,v)
    session.add(p);session.commit();return {"message":"Staff updated"}

@app.get("/api/admin/appointments")
def admin_appointments(user:User=Depends(require_roles("admin")),session:Session=Depends(get_session)):
    return session.exec(select(Appointment).order_by(Appointment.created_at.desc())).all()

@app.get("/api/appointments/mine")
def my_appointments(user:User=Depends(get_current_user),session:Session=Depends(get_session)):
    if user.role=="student":
        return session.exec(select(Appointment).where(Appointment.student_user_id==user.id).order_by(Appointment.created_at.desc())).all()
    if user.role=="staff":
        return session.exec(select(Appointment).where(Appointment.staff_id==user.staff_id).order_by(Appointment.created_at.desc())).all()
    return session.exec(select(Appointment).order_by(Appointment.created_at.desc())).all()

@app.post("/api/appointments")
@app.post("/api/appointments")
async def create_appointment(
    payload: AppointmentInput,
    user: User = Depends(require_roles("student")),
    session: Session = Depends(get_session)
):
    person = session.get(Staff, payload.staff_id)

    if not person or not person.is_active:
        raise HTTPException(404, "Staff member not found")

    item = Appointment(
        staff_id=person.id,
        student_user_id=user.id,
        student_name=user.full_name,
        student_email=user.email,
        requested_date=payload.requested_date,
        requested_time=payload.requested_time,
        purpose=payload.purpose
    )

    session.add(item)
    session.commit()
    session.refresh(item)

    await manager.broadcast({
        "type": "appointment_created",
        "appointment_id": item.id,
        "staff_id": item.staff_id,
        "student_user_id": item.student_user_id,
        "status": item.status
    })

    return {
        "id": item.id,
        "status": item.status,
        "message": "Appointment request submitted"
    }
@app.patch("/api/appointments/{appointment_id}")
@app.patch("/api/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: int,
    payload: AppointmentStatus,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    item = session.get(Appointment, appointment_id)

    if not item:
        raise HTTPException(404, "Appointment not found")

    if user.role == "admin":
        pass
    elif user.role == "staff" and user.staff_id == item.staff_id:
        pass
    else:
        raise HTTPException(
            403,
            "Not authorized to update this appointment"
        )

    if payload.status not in {"Approved", "Rejected", "Completed"}:
        raise HTTPException(400, "Invalid status")

    item.status = payload.status
    session.add(item)
    session.commit()
    session.refresh(item)

    await manager.broadcast({
        "type": "appointment_updated",
        "appointment_id": item.id,
        "staff_id": item.staff_id,
        "student_user_id": item.student_user_id,
        "status": item.status
    })

    return {
        "message": "Appointment updated",
        "status": item.status
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket:WebSocket):
    await manager.connect(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
