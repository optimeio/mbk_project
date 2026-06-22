"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import CTAButton from '@/components/common/CTAButton';

function LegacyAdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const [courseForm, setCourseForm] = useState({ id: '', title: '', image: '', price: '', duration: '', description: '', status: 'Active' });
  const [isEditingCourse, setIsEditingCourse] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // desc or asc

  const fetchOverview = async () => {
    try {
      const res = await axios.get('/api/admin/overview');
      setOverviewData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/admin/courses');
      setCourses(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRegistrations = async () => {
    try {
      const res = await axios.get('/api/admin/registrations');
      setRegistrations(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get('/api/admin/messages');
      setMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/login', { email, password });
      if (res.data.token) setIsAuthenticated(true);
    } catch (err) {
      alert('Invalid credentials');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOverview();
      fetchCourses();
      fetchRegistrations();
      fetchMessages();
    }
  }, [isAuthenticated, activeTab]);

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingCourse) {
        await axios.put(`/api/admin/course/${courseForm.id}`, courseForm);
        alert('Course updated');
      } else {
        await axios.post('/api/admin/course', courseForm);
        alert('Course added');
      }
      setCourseForm({ id: '', title: '', image: '', price: '', duration: '', description: '', status: 'Active' });
      setIsEditingCourse(false);
      fetchCourses();
    } catch (err) { console.error(err); }
  };

  const editCourse = (course) => {
    setCourseForm({
      id: course._id,
      title: course.title,
      image: course.image,
      price: course.price,
      duration: course.duration,
      description: course.description,
      status: course.status
    });
    setIsEditingCourse(true);
    window.scrollTo(0, 0);
  };

  const disableCourse = async (course) => {
    if (!window.confirm(`Disable "${course.title}"?`)) return;
    try {
      await axios.delete(`/api/admin/course/${course._id}`);
      fetchCourses();
      fetchOverview();
    } catch (err) { console.error(err); alert('Failed to disable course'); }
  };

  const downloadCSV = (data, filename) => {
    const csvContent = [
      Object.keys(data[0] || {}).join(","),
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 20px' }}>Admin Login</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'none' }} htmlFor="admin-email">Email</label>
            <input id="admin-email" required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            
            <label style={{ display: 'none' }} htmlFor="admin-password">Password</label>
            <input id="admin-password" required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            
            <CTAButton type="submit" variant="brand" size="lg" fullWidth>Login</CTAButton>
          </form>
        </div>
      </main>
    );
  }

  /* Table Filtering Logic */
  let filteredRegistrations = registrations.filter(r => {
    return r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           r.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
           r.phone.includes(searchTerm);
  });
  if (courseFilter) {
    filteredRegistrations = filteredRegistrations.filter(r => r.courseId && r.courseId._id === courseFilter);
  }
  filteredRegistrations.sort((a, b) => {
    const d1 = new Date(a.createdAt);
    const d2 = new Date(b.createdAt);
    return sortOrder === 'desc' ? d2 - d1 : d1 - d2;
  });

  return (
    <main style={{ paddingTop: '100px', minHeight: '80vh' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>Admin Dashboard</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <CTAButton type="button" variant={activeTab === 'overview' ? 'brand' : 'outline'} size="sm" onClick={() => setActiveTab('overview')}>Overview</CTAButton>
          <CTAButton type="button" variant={activeTab === 'courses' ? 'brand' : 'outline'} size="sm" onClick={() => setActiveTab('courses')}>Course Management</CTAButton>
          <CTAButton type="button" variant={activeTab === 'registrations' ? 'brand' : 'outline'} size="sm" onClick={() => setActiveTab('registrations')}>Registrations</CTAButton>
          <CTAButton type="button" variant={activeTab === 'messages' ? 'brand' : 'outline'} size="sm" onClick={() => setActiveTab('messages')}>Messages {messages.length > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '0.75rem', marginLeft: '5px' }}>{messages.length}</span>}</CTAButton>
        </div>

        {activeTab === 'overview' && overviewData && (
          <div>
             <div className="grid">
                <div className="card">
                   <h3>{overviewData.coursesCount}</h3>
                   <p style={{ color: 'var(--text-muted)' }}>Active Courses</p>
                </div>
                <div className="card">
                   <h3>{overviewData.registrationsCount}</h3>
                   <p style={{ color: 'var(--text-muted)' }}>Total Registrations</p>
                </div>
                <div className="card">
                   <h3>{overviewData.todayRegistrationsCount}</h3>
                   <p style={{ color: 'var(--text-muted)' }}>Registrations Today</p>
                </div>
                <div className="card">
                   <h3>{overviewData.messagesCount || 0}</h3>
                   <p style={{ color: 'var(--text-muted)' }}>Contact Messages</p>
                </div>
             </div>
             <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Recent Registrations</h3>
             <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
                  <thead>
                    <tr style={{ background: 'var(--card-bg)' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Student Name</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Course</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.recentRegistrations.map(r => (
                      <tr key={r._id}>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>{r.studentName}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>{r.courseId?.title || 'Unknown'}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>{new Date(r.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <div className="card" style={{ marginBottom: '30px' }}>
              <h3>{isEditingCourse ? 'Edit Course' : 'Add New Course'}</h3>
              <form onSubmit={handleCourseSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <label style={{ display: 'none' }} htmlFor="course-title">Course Name</label>
                <input id="course-title" required type="text" placeholder="Course Name" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} style={inputStyle} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label htmlFor="course-image" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload Course Image (under 2MB)</label>
                  <input 
                    id="course-image" 
                    type="file" 
                    accept="image/*" 
                    required={!isEditingCourse && !courseForm.image}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                           alert('Image must be less than 2MB');
                           e.target.value = '';
                           return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => setCourseForm({...courseForm, image: reader.result});
                        reader.readAsDataURL(file);
                      }
                    }} 
                    style={{...inputStyle, padding: '7px', background: 'rgba(255,255,255,0.02)'}} 
                  />
                  {courseForm.image && (
                    <img loading="lazy" src={courseForm.image} alt="Preview" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  )}
                </div>                
                <label style={{ display: 'none' }} htmlFor="course-price">Price</label>
                <input id="course-price" type="text" placeholder="Price (e.g. ₹5,000) (Optional)" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: e.target.value})} style={inputStyle} />
                
                <label style={{ display: 'none' }} htmlFor="course-duration">Duration</label>
                <input id="course-duration" type="text" placeholder="Duration (e.g. 3 Months) (Optional)" value={courseForm.duration} onChange={e => setCourseForm({...courseForm, duration: e.target.value})} style={inputStyle} />
                
                <label style={{ display: 'none' }} htmlFor="course-status">Status</label>
                <select id="course-status" value={courseForm.status} onChange={e => setCourseForm({...courseForm, status: e.target.value})} style={inputStyle}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'none' }} htmlFor="course-desc">Description</label>
                  <textarea id="course-desc" required placeholder="Description" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} style={{ ...inputStyle, height: '80px', resize: 'vertical' }}></textarea>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                  <CTAButton type="submit" variant="brand" size="md">{isEditingCourse ? 'Update Course' : 'Add Course'}</CTAButton>
                  {isEditingCourse && (
                    <CTAButton type="button" variant="outline" size="md" onClick={() => { setIsEditingCourse(false); setCourseForm({ id: '', title: '', image: '', price: '', duration: '', description: '', status: 'Active' }); }}>Cancel</CTAButton>
                  )}
                </div>
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Manage Courses</h3>
              <CTAButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(courses.map(c => ({ Name: c.title, Price: c.price, Duration: c.duration, Status: c.status })), 'courses.csv')}
              >
                Export CSV
              </CTAButton>
            </div>
            <div style={{ overflowX: 'auto' }}>
               <table style={tableStyle}>
                 <thead>
                   <tr style={{ background: 'var(--card-bg)' }}>
                     <th style={thStyle}>Course Name</th>
                     <th style={thStyle}>Price</th>
                     <th style={thStyle}>Duration</th>
                     <th style={thStyle}>Status</th>
                     <th style={thStyle}>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {courses.map(c => (
                     <tr key={c._id}>
                       <td style={tdStyle}>{c.title}</td>
                       <td style={tdStyle}>{c.price}</td>
                       <td style={tdStyle}>{c.duration}</td>
                       <td style={tdStyle}>{c.status}</td>
                       <td style={tdStyle}>
                         <button onClick={() => editCourse(c)} style={{ marginRight: '10px', background: 'none', color: 'var(--primary)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
                         {c.status === 'Active' && <button onClick={() => disableCourse(c)} style={{ background: 'none', color: 'red', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Disable</button>}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
              <label htmlFor="search-input" style={{ display: 'none' }}>Search term</label>
              <input id="search-input" type="text" placeholder="Search by name, phone, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, width: '300px' }} />
              
              <label htmlFor="course-filter" style={{ display: 'none' }}>Filter by course</label>
              <select id="course-filter" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ ...inputStyle, width: '200px' }}>
                 <option value="">All Courses</option>
                 {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
              
              <label htmlFor="sort-order" style={{ display: 'none' }}>Sort order</label>
              <select id="sort-order" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ ...inputStyle, width: '150px' }}>
                 <option value="desc">Newest First</option>
                 <option value="asc">Oldest First</option>
              </select>
              
              <CTAButton
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => downloadCSV(filteredRegistrations.map(r => ({ Name: r.studentName, Phone: r.phone, Email: r.email, Course: r.courseId?.title || 'Unknown', Mode: r.mode, Date: new Date(r.createdAt).toLocaleString() })), 'registrations.csv')}
              >
                Export CSV
              </CTAButton>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
               <table style={tableStyle}>
                 <thead>
                   <tr style={{ background: 'var(--card-bg)' }}>
                     <th style={thStyle}>Student Name</th>
                     <th style={thStyle}>Phone</th>
                     <th style={thStyle}>Email</th>
                     <th style={thStyle}>Course</th>
                     <th style={thStyle}>Mode</th>
                     <th style={thStyle}>Date</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredRegistrations.map(r => (
                     <tr key={r._id}>
                       <td style={tdStyle}>{r.studentName}</td>
                       <td style={tdStyle}>{r.phone}</td>
                       <td style={tdStyle}>{r.email}</td>
                       <td style={tdStyle}>{r.courseId?.title || 'Unknown'}</td>
                       <td style={tdStyle}>{r.mode}</td>
                       <td style={tdStyle}>{new Date(r.createdAt).toLocaleString()}</td>
                     </tr>
                   ))}
                   {filteredRegistrations.length === 0 && (
                     <tr><td colSpan="6" style={{ ...tdStyle, textAlign: 'center' }}>No registrations found.</td></tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Contact Messages ({messages.length})</h3>
              <CTAButton type="button" variant="outline" size="sm" onClick={() => downloadCSV(messages.map(m => ({ Name: m.name, Phone: m.phone, Email: m.email, Interest: m.interest, Message: m.message, Date: new Date(m.createdAt).toLocaleString() })), 'messages.csv')}>Export CSV</CTAButton>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Interested In</th>
                    <th style={thStyle}>Message</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m._id}>
                      <td style={tdStyle}>{m.name}</td>
                      <td style={tdStyle}>{m.phone}</td>
                      <td style={tdStyle}>{m.email}</td>
                      <td style={tdStyle}>{m.interest}</td>
                      <td style={{ ...tdStyle, maxWidth: '250px', wordBreak: 'break-word' }}>{m.message}</td>
                      <td style={tdStyle}>{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {messages.length === 0 && (
                    <tr><td colSpan="6" style={{ ...tdStyle, textAlign: 'center' }}>No messages yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

const inputStyle = { padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', width: '100%' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' };
const thStyle = { padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px', borderBottom: '1px solid var(--border)' };

export default LegacyAdminDashboardPage;

