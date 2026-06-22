"use client";

import Icon from '@/components/common/Icon';
import CTAButton from '@/components/common/CTAButton';
import { useState, useEffect } from 'react';
import axios from 'axios';

function LegacyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: '',
    qualification: '',
    timing: '',
    mode: 'Offline',
  });

  useEffect(() => {
    // Reveal Observer for newly added elements
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));

    return () => revealObserver.disconnect();
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCourses = async (retries = 3) => {
      try {
        const res = await axios.get('/api/web/courses', { timeout: 30000 });
        if (isMounted) {
          setCourses(res.data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          if (retries > 0) {
            console.log(`Retrying courses fetch... (${retries} left)`);
            setTimeout(() => {
              if (isMounted) fetchCourses(retries - 1);
            }, 3000);
          } else {
            console.error('Error fetching courses:', err);
            setError('Unable to retrieve active courses. Please check your internet connection and try again.');
            setLoading(false);
          }
        }
      }
    };
    fetchCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const openRegisterModal = (course) => {
    setSelectedCourse(course);
    setShowModal(true);
  };

  const closeRegisterModal = () => {
    setShowModal(false);
    setSelectedCourse(null);
    setFormData({ studentName: '', phone: '', email: '', qualification: '', timing: '', mode: 'Offline' });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/web/register', {
        ...formData,
        courseId: selectedCourse._id
      });
      alert('Registration successful! We will contact you soon.');
      closeRegisterModal();
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Failed to register. Please try again later.');
    }
  };

  return (
    <main style={{ paddingTop: '100px', minHeight: '80vh' }}>
            <section className="domains">
        <div className="container">
          <div className="section-title reveal">
            <span className="section-label">All Courses</span>
            <h2>Available Training Programs</h2>
            <div className="section-divider"></div>
            <p>Explore our wide range of technical and engineering courses.</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3>Loading courses...</h3>
            </div>
          ) : error ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '30px', 
              background: '#fef2f2', 
              border: '1px solid #fee2e2', 
              borderRadius: '1rem', 
              color: '#991b1b',
              maxWidth: '600px',
              margin: '2rem auto'
            }}>
              <Icon name="alert-circle" style={{ width: '32px', height: '32px', margin: '0 auto 10px auto', display: 'block', color: '#ef4444' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Failed to Load Courses</h3>
              <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>{error}</p>
            </div>
          ) : (
            <div className="grid">
              {courses.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No active courses found.</div>
              ) : (
                courses.map((course, index) => (
                  <div className="card reveal" style={{ transitionDelay: `${(index % 4) * 0.1}s` }} key={course._id}>
                    {course.image && (
                      <div style={{ margin: '-2rem -2rem 1.5rem -2rem', borderRadius: '1rem 1rem 0 0', overflow: 'hidden', height: '200px' }}>
                        <img loading="lazy" src={course.image} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h3>{course.title}</h3>
                    <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                      {course.duration && <p><Icon name="clock" style={{ width: '16px', height: '16px', display: 'inline', marginRight: '5px' }} /> Duration: {course.duration}</p>}
                      {course.price && <p><Icon name="tag" style={{ width: '16px', height: '16px', display: 'inline', marginRight: '5px' }} /> Price: {course.price}</p>}
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{course.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                      <CTAButton href={`/course/${course._id}`} variant="outline" size="sm" className="flex-1">
                        View Details
                      </CTAButton>
                      <CTAButton type="button" variant="brand" size="sm" className="flex-1" onClick={() => openRegisterModal(course)}>
                        Register Now
                      </CTAButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* Registration Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={closeRegisterModal} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text)' }}>&times;</button>
            <h3 style={{ marginBottom: '1rem' }}>Register for {selectedCourse?.title}</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="reg-name" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text)' }}>Student Name</label>
                <input id="reg-name" required type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div>
                    <label htmlFor="reg-phone" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text)' }}>Phone Number</label>
                    <input id="reg-phone" required type="text" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                 </div>
                 <div>
                    <label htmlFor="reg-email" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text)' }}>Email</label>
                    <input id="reg-email" required type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                 </div>
              </div>
              <div>
                <label htmlFor="reg-qual" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text)' }}>Qualification</label>
                <input id="reg-qual" required type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label htmlFor="reg-timing" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text)' }}>Preferred Timing</label>
                  <input id="reg-timing" required type="text" name="timing" value={formData.timing} onChange={handleInputChange} placeholder="E.g. Morning, 6 PM" style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label htmlFor="reg-mode" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text)' }}>Mode</label>
                  <select id="reg-mode" name="mode" value={formData.mode} onChange={handleInputChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}>
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>
              <CTAButton type="submit" variant="brand" size="lg" fullWidth className="mt-2">Submit Registration</CTAButton>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default LegacyCoursesPage;

