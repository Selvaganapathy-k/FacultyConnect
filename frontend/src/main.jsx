import React,{useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {MapContainer,TileLayer,Marker,Popup} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './style.css'

const API = import.meta.env.VITE_API_URL
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const auth=()=>({Authorization:`Bearer ${localStorage.getItem('fc_token')||''}`})
async function call(path,opts={}) {
 const r=await fetch(API+path,{...opts,headers:{...auth(),...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}})
 const data=await r.json().catch(()=>({}))
 if(!r.ok) throw new Error(data.detail||'Request failed')
 return data
}
function App(){
 const [user,setUser]=useState(null),[page,setPage]=useState('home'),[notice,setNotice]=useState('')
 const [staff,setStaff]=useState([]),[rooms,setRooms]=useState([]),[appointments,setAppointments]=useState([])
 const [search,setSearch]=useState(''),[department,setDepartment]=useState('All')
 const [selected,setSelected]=useState(null),[loginMode,setLoginMode]=useState('login')
 const [credentials,setCredentials]=useState({full_name:'',email:'',password:''})
 async function load(){
  try{const [s,r]=await Promise.all([call('/api/staff'),call('/api/rooms')]);setStaff(s);setRooms(r)
   if(user){const a=await call(user.role==='admin'?'/api/admin/appointments':'/api/appointments/mine');setAppointments(a)}
  }catch(e){setNotice(e.message)}
 }
 useEffect(()=>{const t=localStorage.getItem('fc_token');if(t)call('/api/auth/me').then(u=>setUser(u)).catch(()=>localStorage.removeItem('fc_token'))},[])
 useEffect(()=>{if(user)load()},[user])
 useEffect(()=>{if(!user)return;const ws=new WebSocket(API.replace('http','ws')+'/ws');ws.onmessage=()=>load();return()=>ws.close()},[!!user])
 async function submitAuth(e){e.preventDefault();try{const endpoint=loginMode==='login'?'/api/auth/login':'/api/auth/register';const data=await call(endpoint,{method:'POST',body:JSON.stringify(credentials)});localStorage.setItem('fc_token',data.access_token);setUser(data.user);setNotice('Welcome to FacultyConnect');}catch(e){setNotice(e.message)}}
 function logout(){localStorage.removeItem('fc_token');setUser(null);setStaff([]);setAppointments([]);setPage('home')}
 const filtered=staff.filter(s=>(`${s.name} ${s.department} ${s.designation}`.toLowerCase().includes(search.toLowerCase()))&&(department==='All'||s.department===department))
 if(!user)return <div className="auth-screen"><div className="auth-card"><div className="logo">FC</div><p className="eyebrow">CAMPUS STAFF PLATFORM</p><h1>{loginMode==='login'?'Welcome back':'Create student account'}</h1><p className="muted">Find faculty, manage availability and navigate campus.</p><form onSubmit={submitAuth}>{loginMode==='register'&&<input required placeholder="Full name" value={credentials.full_name} onChange={e=>setCredentials({...credentials,full_name:e.target.value})}/>}<input required type="email" placeholder="Email address" value={credentials.email} onChange={e=>setCredentials({...credentials,email:e.target.value})}/><input required type="password" minLength="8" placeholder="Password (minimum 8 characters)" value={credentials.password} onChange={e=>setCredentials({...credentials,password:e.target.value})}/><button className="primary">{loginMode==='login'?'Sign in':'Create account'}</button></form><button className="text-button" onClick={()=>setLoginMode(loginMode==='login'?'register':'login')}>{loginMode==='login'?"New student? Create account":"Already registered? Sign in"}</button><div className="demo-login"><b>Demo admin account</b><span>admin@facultyconnect.local</span><span>ChangeMe123!</span><small>Change the bootstrap password before real deployment.</small></div>{notice&&<p className="notice">{notice}</p>}</div></div>
 const depts=['All',...new Set(staff.map(s=>s.department))]
 return <div className="layout"><aside><div className="brand"><div className="logo">FC</div><b>FacultyConnect</b></div><p className="side-label">WORKSPACE</p><button className={page==='home'?'active':''} onClick={()=>setPage('home')}>⌂ &nbsp; Directory</button>{user.role==='staff'&&<button className={page==='staff'?'active':''} onClick={()=>setPage('staff')}>◷ &nbsp; My workspace</button>}{user.role==='admin'&&<><button className={page==='admin'?'active':''} onClick={()=>setPage('admin')}>▦ &nbsp; Admin overview</button><button className={page==='manage'?'active':''} onClick={()=>setPage('manage')}>＋ &nbsp; Manage campus</button></>}<button className={page==='map'?'active':''} onClick={()=>setPage('map')}>⌖ &nbsp; Campus map</button><div className="side-user"><b>{user.full_name}</b><small>{user.role.toUpperCase()}</small><button onClick={logout}>Sign out</button></div></aside>
 <button
  className={page==='appointments'?'active':''}
  onClick={()=>setPage('appointments')}
>
  📅 &nbsp; Appointments
</button>
 <main><header><div><small>FACULTYCONNECT / {page.toUpperCase()}</small><h2>{page==='home'?'Faculty directory':page==='staff'?'Staff workspace':page==='admin'?'Admin overview':page==='manage'?'Campus management':'Interactive campus map'}</h2></div><button className="secondary" onClick={load}>↻ Refresh</button></header>{notice&&<div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
 {page==='home'&&<><section className="hero"><p className="eyebrow">CAMPUS DIRECTORY · {user.role.toUpperCase()} PORTAL</p><h1>Find your faculty.<br/><em>Make every visit count.</em></h1><p>Check staff availability, office hours and room locations.</p></section><div className="stats"><Stat label="Faculty" value={staff.length}/><Stat label="Available" value={staff.filter(x=>x.status==='Available').length}/><Stat label="Rooms" value={rooms.length}/></div><div className="filters"><input placeholder="Search faculty, department..." value={search} onChange={e=>setSearch(e.target.value)}/><select value={department} onChange={e=>setDepartment(e.target.value)}>{depts.map(d=><option>{d}</option>)}</select></div><div className="cards">{filtered.map(p=><article className="card" key={p.id}><div className="cardline"><div className="avatar">{p.name[0]}</div><span className={'pill '+p.status?.toLowerCase().replaceAll(' ','-')}>{p.status}</span></div><h3>{p.name}</h3><p>{p.designation} · {p.department}</p><p>⌖ {p.room?`${p.room.building} / ${p.room.room_number}`:'Room not assigned'}</p><button className="secondary" onClick={async()=>setSelected(await call(`/api/staff/${p.id}`))}>View schedule & details</button>{user.role==='student'&&<button className="primary" onClick={()=>setSelected({...p,showBook:true})}>Request appointment</button>}</article>)}</div></>}
 {user.role === 'student' && (
  <StudentAppointmentSummary
    appointments={appointments}
    staff={staff}
    onViewAll={() => setPage('appointments')}
  />
)}
 {page==='staff'&&user.role==='staff'&&<StaffPage user={user} staff={staff} rooms={rooms} appointments={appointments} refresh={load} notify={setNotice}/>}
 {page==='admin'&&user.role==='admin'&&<AdminPage staff={staff} rooms={rooms} appointments={appointments} notify={setNotice} refresh={load}/>}
 {page==='appointments'&&
  <AppointmentsPage
    user={user}
    appointments={appointments}
    staff={staff}
    notify={setNotice}
    refresh={load}
  />
}
 {page==='manage'&&user.role==='admin'&&<ManagePage rooms={rooms} refresh={load} notify={setNotice}/>}
 {page==='map'&&<CampusMap rooms={rooms}/>}
 {selected&&<div className="shade" onClick={()=>setSelected(null)}><div className="dialog" onClick={e=>e.stopPropagation()}><button className="x" onClick={()=>setSelected(null)}>×</button><h2>{selected.name}</h2><p>{selected.designation} · {selected.department}</p><p><b>Room:</b> {selected.room?`${selected.room.building}, ${selected.room.room_number}`:'Not assigned'}</p><h3>Weekly schedule</h3>{(selected.schedule||[]).map(s=><p>{days[s.day_of_week]} · {s.start_time}–{s.end_time} · {s.activity}</p>)}{selected.showBook&&<Booking staffId={selected.id} notify={setNotice} close={()=>setSelected(null)} refresh={load}/>}</div></div>}
 </main></div>
}
function StudentAppointmentSummary({appointments,staff,onViewAll}) {
  const pending = appointments.filter(a => a.status === 'Pending').length;
  const approved = appointments.filter(a => a.status === 'Approved').length;
  const rejected = appointments.filter(a => a.status === 'Rejected').length;
  const completed = appointments.filter(a => a.status === 'Completed').length;

  const latest = [...appointments].sort(
    (a,b) => new Date(b.created_at) - new Date(a.created_at)
  )[0];

  const faculty = latest
    ? staff.find(s => s.id === latest.staff_id)
    : null;

  return (
    <section className="panel">
      <div className="cardline">
        <h3>My Appointment Summary</h3>
        <button className="secondary" onClick={onViewAll}>
          View all appointments
        </button>
      </div>

      <div className="stats">
        <Stat label="Total" value={appointments.length}/>
        <Stat label="Pending" value={pending}/>
        <Stat label="Approved" value={approved}/>
        <Stat label="Rejected" value={rejected}/>
      </div>

      <div className="list-row">
        <b>Completed appointments: {completed}</b>
      </div>

      <h3>Latest Appointment</h3>

      {!latest ? (
        <p className="muted">
          You have not booked any appointments yet.
        </p>
      ) : (
        <div className="list-row">
          <b>{faculty?.name || `Faculty #${latest.staff_id}`}</b>
          <span>Appointment ID: {latest.id}</span>
          <span>Date: {latest.requested_date}</span>
          <span>Time: {latest.requested_time}</span>
          <span>Purpose: {latest.purpose}</span>
          <span>
            Status:
            {' '}
            <span className={`pill ${latest.status.toLowerCase()}`}>
              {latest.status}
            </span>
          </span>
        </div>
      )}
    </section>
  );
}
function Stat({label,value}){return <div className="stat"><small>{label}</small><b>{value}</b></div>}
function Booking({staffId,notify,close,refresh}){const [form,setForm]=useState({requested_date:'',requested_time:'',purpose:''});async function send(e){e.preventDefault();try{await call('/api/appointments',{method:'POST',body:JSON.stringify({...form,staff_id:staffId})});notify('Appointment request submitted');close();refresh()}catch(e){notify(e.message)}}return <form onSubmit={send} className="stack"><h3>Request appointment</h3><input required type="date" min={new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,requested_date:e.target.value})}/><input required type="time" onChange={e=>setForm({...form,requested_time:e.target.value})}/><textarea required placeholder="Purpose" onChange={e=>setForm({...form,purpose:e.target.value})}/><button className="primary">Submit request</button></form>}
function StaffPage({user,staff,rooms,appointments,refresh,notify}) {
  const person=staff.find(s=>s.id===user.staff_id);

  const [status,setStatus]=useState(person?.status||'Available');
  const [note,setNote]=useState(person?.status_note||'');
  const [schedule,setSchedule]=useState({
    day_of_week:1,
    start_time:'10:00',
    end_time:'11:00',
    activity:'Office Hours',
    room_id:''
  });

  const [mine,setMine]=useState([]);

  useEffect(()=>{
    if(user.staff_id)
      call(`/api/staff/${user.staff_id}/schedule`).then(setMine);
  },[user.staff_id]);

  async function save(e) {
    e.preventDefault();
    try {
      await call(`/api/staff/${user.staff_id}/status`,{
        method:'POST',
        body:JSON.stringify({status,note})
      });
      notify('Availability updated');
      refresh();
    } catch(e) {
      notify(e.message);
    }
  }

  async function add(e) {
    e.preventDefault();
    try {
      await call(`/api/staff/${user.staff_id}/schedule`,{
        method:'POST',
        body:JSON.stringify({
          ...schedule,
          room_id:schedule.room_id
            ?Number(schedule.room_id):null
        })
      });
      setMine(await call(`/api/staff/${user.staff_id}/schedule`));
      notify('Schedule added');
    } catch(e) {
      notify(e.message);
    }
  }

  async function updateAppointment(id,newStatus) {
    try {
      await call(`/api/appointments/${id}`,{
        method:'PATCH',
        body:JSON.stringify({status:newStatus})
      });
      notify(`Appointment ${newStatus} successfully`);
      await refresh();
    } catch(e) {
      notify(e.message);
    }
  }

  return (
    <div className="cols">

      <section className="panel">
        <h3>My availability</h3>
        <p>{person?.name||user.full_name}</p>

        <form onSubmit={save} className="stack">
          <select value={status}
            onChange={e=>setStatus(e.target.value)}>
            {['Available','Busy','In Class','On Leave'].map(x=>
              <option key={x}>{x}</option>
            )}
          </select>

          <textarea placeholder="Status note"
            value={note}
            onChange={e=>setNote(e.target.value)}
          />

          <button className="primary">Update status</button>
        </form>

        <h3>My schedule</h3>

        {mine.map(s=>(
          <div className="list-row" key={s.id}>
            {days[s.day_of_week]} · {s.start_time}–{s.end_time} · {s.activity}
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>My appointment requests</h3>
        <p className="muted">
          Review requests from students and manage their appointment status.
        </p>

        {appointments.length===0 ? (
          <p className="muted">No appointment requests received.</p>
        ):appointments.map(a=>(
          <div className="list-row" key={a.id}>
            <b>{a.student_name}</b>

            <span>{a.student_email}</span>
            <span>Date: {a.requested_date}</span>
            <span>Time: {a.requested_time}</span>
            <span>Purpose: {a.purpose}</span>
            <span><b>Status: {a.status}</b></span>

            {a.status==='Pending' && (
              <div className="actions">
                <button onClick={()=>
                  updateAppointment(a.id,'Approved')}>
                  Approve
                </button>

                <button onClick={()=>
                  updateAppointment(a.id,'Rejected')}>
                  Reject
                </button>
              </div>
            )}

            {a.status==='Approved' && (
              <div className="actions">
                <button onClick={()=>
                  updateAppointment(a.id,'Completed')}>
                  Mark Completed
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>Add schedule entry</h3>

        <form className="stack" onSubmit={add}>
          <select value={schedule.day_of_week}
            onChange={e=>setSchedule({
              ...schedule,
              day_of_week:Number(e.target.value)
            })}>
            {days.map((d,i)=><option key={i} value={i}>{d}</option>)}
          </select>

          <input type="time" value={schedule.start_time}
            onChange={e=>setSchedule({...schedule,start_time:e.target.value})}/>

          <input type="time" value={schedule.end_time}
            onChange={e=>setSchedule({...schedule,end_time:e.target.value})}/>

          <input placeholder="Activity"
            value={schedule.activity}
            onChange={e=>setSchedule({...schedule,activity:e.target.value})}/>

          <select value={schedule.room_id}
            onChange={e=>setSchedule({...schedule,room_id:e.target.value})}>
            <option value="">Use default room</option>
            {rooms.map(r=><option key={r.id} value={r.id}>
              {r.building} / {r.room_number}
            </option>)}
          </select>

          <button className="primary">Add schedule</button>
        </form>
      </section>

    </div>
  );
}
function AdminPage({staff,rooms,appointments,notify,refresh}){async function change(id,status){try{await call(`/api/appointments/${id}`,{method:'PATCH',body:JSON.stringify({status})});notify(`Request ${status.toLowerCase()}`);refresh()}catch(e){notify(e.message)}}return <><div className="stats"><Stat label="Faculty" value={staff.length}/><Stat label="Rooms" value={rooms.length}/><Stat label="Appointments" value={appointments.length}/><Stat label="Pending" value={appointments.filter(a=>a.status==='Pending').length}/></div><section className="panel"><h3>Appointment approvals</h3>{appointments.map(a=><div className="list-row"><b>{a.student_name}</b> · Staff #{a.staff_id} · {a.requested_date} {a.requested_time}<span>{a.purpose}</span><span className="actions">{a.status}{a.status==='Pending'&&<><button onClick={()=>change(a.id,'Approved')}>Approve</button><button onClick={()=>change(a.id,'Rejected')}>Reject</button></>}</span></div>)}</section><section className="panel"><h3>Faculty directory status</h3>{staff.map(s=><div className="list-row">{s.name} · {s.department}<span>{s.status} — {s.room?.room_number||'No room'}</span></div>)}</section></>}

function ManagePage({ rooms, refresh, notify }) {
  const [staff, setStaff] = useState({
    name: '',
    department: '',
    designation: '',
    email: '',
    account_password: '',
    room_id: ''
  });

  const [room, setRoom] = useState({
    building: '',
    floor: '',
    room_number: '',
    room_name: '',
    latitude: '',
    longitude: ''
  });

  // Remove duplicate rooms
  const uniqueRooms = Array.from(
    new Map(
      rooms.map(r => [
        `${r.building}-${r.room_number}`.trim().toLowerCase(),
        r
      ])
    ).values()
  );

  async function addStaff(e) {
    e.preventDefault();
    try {
      await call('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          ...staff,
          room_id: staff.room_id ? Number(staff.room_id) : null
        })
      });

      notify('Faculty and login created');
      setStaff({
        name: '',
        department: '',
        designation: '',
        email: '',
        account_password: '',
        room_id: ''
      });
      refresh();
    } catch (e) {
      notify(e.message);
    }
  }

  async function addRoom(e) {
    e.preventDefault();
    try {
      await call('/api/admin/rooms', {
        method: 'POST',
        body: JSON.stringify({
          ...room,
          latitude: room.latitude ? Number(room.latitude) : null,
          longitude: room.longitude ? Number(room.longitude) : null
        })
      });

      notify('Room created');
      refresh();
    } catch (e) {
      notify(e.message);
    }
  }

  return (
    <div className="cols">
      <section className="panel">
        <h3>Create faculty account</h3>
        <form className="stack" onSubmit={addStaff}>
          {['name', 'department', 'designation', 'email', 'account_password'].map(k => (
            <input
              key={k}
              required
              type={k === 'email' ? 'email' : k === 'account_password' ? 'password' : 'text'}
              placeholder={k.replace('_', ' ')}
              value={staff[k]}
              onChange={e => setStaff({ ...staff, [k]: e.target.value })}
            />
          ))}

          <select
            value={staff.room_id}
            onChange={e => setStaff({ ...staff, room_id: e.target.value })}
          >
            <option value="">No room assigned</option>
            {uniqueRooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.building} / {r.room_number}
              </option>
            ))}
          </select>

          <button className="primary">Create staff account</button>
        </form>
      </section>

      <section className="panel">
        <h3>Add campus room</h3>
        <form className="stack" onSubmit={addRoom}>
          {['building', 'floor', 'room_number', 'room_name', 'latitude', 'longitude'].map(k => (
            <input
              key={k}
              placeholder={k.replace('_', ' ')}
              value={room[k]}
              onChange={e => setRoom({ ...room, [k]: e.target.value })}
            />
          ))}
          <button className="primary">Save room</button>
        </form>
      </section>
    </div>
  );
}

function AppointmentsPage({user,appointments,staff,notify,refresh}) {

  async function updateAppointment(id,status) {
    try {
      await call(`/api/appointments/${id}`, {
        method:'PATCH',
        body:JSON.stringify({status})
      });

      notify(`Appointment ${status.toLowerCase()} successfully`);
      await refresh();

    } catch(error) {
      notify(error.message);
    }
  }

  const isStudent = user.role === 'student';

  const isAdmin = user.role === 'admin';

  return (
    <section className="panel">
      <h3>
        {isStudent
          ? 'My Appointment History'
          : isAdmin
          ? 'Appointment Management'
          : 'Faculty Appointment Requests'}
      </h3>

      <p className="muted">
        {isStudent
          ? 'Track all your appointment requests and their approval status.'
          : 'Review appointment requests and update their status.'}
      </p>

      {appointments.length === 0 ? (
        <div className="map-empty">
          No appointments found.
        </div>
      ) : (
        appointments.map(a => {
          const faculty = staff.find(s => s.id === a.staff_id);

          return (
            <div className="list-row" key={a.id}>

              <b>
                {isStudent
                  ? faculty?.name || `Faculty #${a.staff_id}`
                  : a.student_name}
              </b>

              <span>
                Appointment ID: {a.id}
              </span>

              <span>
                Date: {a.requested_date}
              </span>

              <span>
                Time: {a.requested_time}
              </span>

              <span>
                Purpose: {a.purpose}
              </span>

              <span>
                Status: <b>{a.status}</b>
              </span>

              {!isStudent && a.status === 'Pending' && (
                <div className="actions">
                  <button
                    onClick={() =>
                      updateAppointment(a.id,'Approved')
                    }
                  >
                    Approve
                  </button>

                  <button
                    onClick={() =>
                      updateAppointment(a.id,'Rejected')
                    }
                  >
                    Reject
                  </button>
                </div>
              )}

              {!isStudent && a.status === 'Approved' && (
                <div className="actions">
                  <button
                    onClick={() =>
                      updateAppointment(a.id,'Completed')
                    }
                  >
                    Mark Completed
                  </button>
                </div>
              )}

            </div>
          );
        })
      )}
    </section>
  );
}
function CampusMap({rooms}){const mapped=rooms.filter(r=>r.latitude&&r.longitude);const center=mapped.length?[mapped[0].latitude,mapped[0].longitude]:[11.508,77.238];return <section className="panel"><h3>Campus room locator</h3><p className="muted">Map markers appear for rooms with verified latitude and longitude. Add coordinates in Admin → Manage campus.</p>{mapped.length?<MapContainer center={center} zoom={16} style={{height:480,width:'100%',borderRadius:12}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{mapped.map(r=><Marker position={[r.latitude,r.longitude]}><Popup>{r.building} · {r.room_number}<br/>{r.room_name}</Popup></Marker>)}</MapContainer>:<div className="map-empty">No room coordinates added yet.<br/>Admin can add verified latitude and longitude to display room pins.</div>}</section>}
createRoot(document.getElementById('root')).render(<App/>)
