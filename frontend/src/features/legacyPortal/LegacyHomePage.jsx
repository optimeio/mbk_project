"use client";

import Icon from '@/components/common/Icon';
import CTAButton from '@/components/common/CTAButton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import AboutPage from '@/features/about/pages/AboutPage';
import LegacyServicesPage from './LegacyServicesPage';
import LegacyContactPage from './LegacyContactPage';

class Particle {
  constructor(W, H) {
    this.reset(W, H);
  }
  reset(W, H) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.size = Math.random() * 1.5 + 0.4;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.speedY = (Math.random() - 0.5) * 0.4;
    this.opacity = Math.random() * 0.5 + 0.1;
    const colors = ['249,115,22', '225,29,72', '139,92,246', '255,255,255'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }
  update(W, H) {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset(W, H);
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color},${this.opacity})`;
    ctx.fill();
  }
}

function LegacyHomePage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(4);
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
    const fetchCourses = async (retries = 3) => {
      try {
        const res = await axios.get('/api/courses', { timeout: 30000 });
        setCourses(res.data);
      } catch (err) {
        if (retries > 0) {
          console.log(`Retrying courses fetch... (${retries} left)`);
          setTimeout(() => fetchCourses(retries - 1), 3000);
        } else {
          console.error('Error fetching courses:', err);
          setLoading(false);
        }
        return;
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Re-run reveal observer whenever courses load so cards animate in
  useEffect(() => {
    if (courses.length === 0) return;
    const timer = setTimeout(() => {
      const revealEls = document.querySelectorAll('.reveal:not(.active), .reveal-left:not(.active), .reveal-right:not(.active), .reveal-scale:not(.active)');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
      revealEls.forEach(el => obs.observe(el));
    }, 100);
    return () => clearTimeout(timer);
  }, [courses]);

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
      await axios.post('/api/register', {
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

  useEffect(() => {
    // Reveal script
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));

    // Particle script - disabled on mobile for performance
    const canvas = document.getElementById('particle-canvas');
    const isMobile = window.innerWidth < 768;
    if (canvas && !isMobile) {
      const ctx = canvas.getContext('2d');
      let W = canvas.width = window.innerWidth;
      let H = canvas.height = window.innerHeight;

      const particles = [];
      const count = Math.min(70, Math.floor(W * H / 18000));

      for (let i = 0; i < count; i++) particles.push(new Particle(W, H));

      function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
          for (let b = a + 1; b < particles.length; b++) {
            const dx = particles[a].x - particles[b].x;
            const dy = particles[a].y - particles[b].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.strokeStyle = `rgba(249,115,22,${0.08 * (1 - dist / 120)})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(particles[a].x, particles[a].y);
              ctx.lineTo(particles[b].x, particles[b].y);
              ctx.stroke();
            }
          }
        }
      }

      let animationId;
      function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(W, H); p.draw(ctx); });
        connectParticles();
        animationId = requestAnimationFrame(animate);
      }
      animate();

      const handleResize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);

      // Counters Note: to prevent leak
      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        revealObserver.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    // Animated Counters
    function animateCounter(el) {
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 2000;
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(ease * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
    }

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter-num[data-target]').forEach(el => counterObserver.observe(el));

    // Typed Text
    const typedEl = document.getElementById('typed-text');
    let timeoutId;
    if (typedEl) {
      const phrases = typedEl.getAttribute('data-phrases').split('|');
      let phraseIndex = 0, charIndex = 0, deleting = false;

      function type() {
        const current = phrases[phraseIndex % phrases.length];
        if (deleting) {
          typedEl.textContent = current.substring(0, charIndex--);
        } else {
          typedEl.textContent = current.substring(0, charIndex++);
        }

        let speed = deleting ? 40 : 90;

        if (!deleting && charIndex > current.length) {
          deleting = true;
          speed = 1800;
        } else if (deleting && charIndex < 0) {
          deleting = false;
          phraseIndex++;
          speed = 400;
        }
        timeoutId = setTimeout(type, speed);
      }
      type();
    }
    
    // Magnetic Buttons
    const handleMouseMove = (e) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translateY(-3px) translate(${x * 0.12}px, ${y * 0.12}px)`;
    };
    const handleMouseLeave = (e) => {
        e.currentTarget.style.transform = '';
    };
    
    const mBtns = document.querySelectorAll('.cta-btn, .nav-btn');
    mBtns.forEach(btn => {
        btn.addEventListener('mousemove', handleMouseMove);
        btn.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      counterObserver.disconnect();
      clearTimeout(timeoutId);
      mBtns.forEach(btn => {
          btn.removeEventListener('mousemove', handleMouseMove);
          btn.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Toggle FAQ
  const toggleFaq = (e) => {
    const btn = e.currentTarget;
    const answer = btn.nextElementSibling;
    const isOpen = btn.classList.contains('active');

    document.querySelectorAll('.faq-question').forEach(b => {
      b.classList.remove('active');
      b.nextElementSibling.classList.remove('active');
    });

    if (!isOpen) {
      btn.classList.add('active');
      answer.classList.add('active');
    }
  };

  return (
    <main>
            {/* Particle Canvas behind hero */}
      <canvas id="particle-canvas"></canvas>
      
      {/* HERO */}
      <header className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-badge"><span className="dot"></span>Salem's No.1 Technical Training Organization</div>
          <h1>MBK Technology –<br /><span className="highlight" id="typed-text" data-phrases="Engineering Excellence|Industry 4.0 Training|AI &amp; EV Programs|Skill Development"></span><span style={{ display: 'inline-block', width: '2px', height: '0.85em', background: 'var(--primary)', marginLeft: '3px', verticalAlign: 'middle', animation: 'blinkCursor 1s step-end infinite' }}></span></h1>
          <div className="hero-tags">
            <span className="hero-tag">Industry 4.0</span><span className="hero-tag">AI &amp; ML</span><span className="hero-tag">Electric Vehicles</span>
            <span className="hero-tag">Smart Infrastructure</span><span className="hero-tag">Naan Mudhalvan</span><span className="hero-tag">Corporate Excellence</span>
          </div>
          <p>Premium technical training organization in Salem, Tamil Nadu — delivering structured, industry-aligned, and employment-focused engineering education for institutions and individuals.</p>
          <div className="hero-btns">
            <CTAButton
              href="https://wa.me/918807653965"
              variant="brand"
              size="lg"
              iconLeft={<Icon name="message-circle" style={{ width: '18px', height: '18px' }} />}
            >
              Admissions &amp; Partnerships
            </CTAButton>
            <CTAButton
              href="#courses"
              variant="outline"
              size="lg"
              iconLeft={<Icon name="graduation-cap" style={{ width: '18px', height: '18px' }} />}
              onClick={(e) => { e.preventDefault(); document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Explore Programs
            </CTAButton>
          </div>
          <div className="hero-stats">
            <div className="stat-item"><span className="stat-num counter-num" data-target="100" data-suffix="+">0+</span><span className="stat-label">Concurrent Batches</span></div>
            <div className="stat-item"><span className="stat-num counter-num" data-target="5000" data-suffix="+">0+</span><span className="stat-label">Students Trained</span></div>
            <div className="stat-item"><span className="stat-num counter-num" data-target="50" data-suffix="+">0+</span><span className="stat-label">Partner Institutions</span></div>
            <div className="stat-item"><span className="stat-num counter-num" data-target="6" data-suffix="">0</span><span className="stat-label">Engineering Domains</span></div>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="marquee-section">
        <div className="marquee-inner">
          <span>Industry 4.0</span><span>AI &amp; Data Analytics</span><span>Electric Vehicles</span>
          <span>Civil Engineering</span><span>Mechanical Engineering</span><span>Naan Mudhalvan</span>
          <span>Smart Infrastructure</span><span>Embedded Systems</span><span>Corporate Excellence</span>
          <span>Industry 4.0</span><span>AI &amp; Data Analytics</span><span>Electric Vehicles</span>
          <span>Civil Engineering</span><span>Mechanical Engineering</span><span>Naan Mudhalvan</span>
        </div>
      </div>


      {/* COURSES (DYNAMIC) */}
      <section id="courses" className="courses-section" style={{ background: 'rgba(249,115,22,0.02)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-title reveal">
            <span className="section-label">Enroll Now</span>
            <h2>Available Training Programs</h2>
            <div className="section-divider"></div>
            <p>Explore our wide range of technical and engineering courses.</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Loading courses... (may take a moment on first load)</p>
            </div>
          ) : (
            <>
            <div className="grid">
              {courses.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No active courses available at the moment.</div>
              ) : (
                courses.slice(0, visibleCount).map((course, index) => (
                  <div
                    className="card"
                    key={course._id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 0,
                      overflow: 'hidden',
                      animation: `fadeInUp 0.4s ease ${(index % 4) * 0.08}s both`,
                    }}
                  >
                    {/* Course Image */}
                    <div style={{ width: '100%', height: '180px', overflow: 'hidden', flexShrink: 0 }}>
                      {course.image ? (
                        <img
                          src={course.image}
                          alt={course.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary), #b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="book-open" style={{ width: '40px', height: '40px', color: 'white', opacity: 0.7 }} />
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.6rem', lineHeight: 1.4, color: 'var(--text-main)' }}>
                        {course.title}
                      </h3>

                      {/* Meta Row */}
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                        {course.duration && (
                          <span style={{ fontSize: '0.82rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icon name="clock" style={{ width: '13px', height: '13px' }} /> {course.duration}
                          </span>
                        )}
                        {course.price && (
                          <span style={{ fontSize: '0.82rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icon name="tag" style={{ width: '13px', height: '13px' }} /> {course.price}
                          </span>
                        )}
                      </div>

                      {/* Description — truncated to 3 lines */}
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        flexGrow: 1,
                        marginBottom: '1.2rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {course.description || 'A comprehensive training program designed for industry readiness.'}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                        <CTAButton
                          href={`/course/${course._id}`}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          View Details
                        </CTAButton>
                        <CTAButton
                          type="button"
                          variant="brand"
                          size="sm"
                          className="flex-1"
                          onClick={() => openRegisterModal(course)}
                        >
                          Register Now
                        </CTAButton>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {visibleCount < courses.length && (
              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <CTAButton type="button" variant="outline" size="md" onClick={() => setVisibleCount(courses.length)}>
                  Load More Programs ({courses.length - visibleCount} more)
                </CTAButton>
              </div>
            )}
            </>
          )}
        </div>
      </section>


      {/* REVIEWS */}
      <section className="google-review-section">
        <div className="container">
          <div className="section-title reveal">
            <span className="section-label">Testimonials</span>
            <h2>Trusted by Thousands</h2>
            <div className="section-divider"></div>
          </div>
          <div className="google-card reveal-scale">
            <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google Reviews" loading="lazy" className="google-logo" />
            <div className="stars">
              <Icon name="star" /><Icon name="star" /><Icon name="star" /><Icon name="star" /><Icon name="star" />
            </div>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '1.05rem', fontStyle: 'italic', lineHeight: '1.8' }}>
              "Best technical training and government initiative aligned institute in Salem. Highly recommended for institutional partnerships."
            </p>
            <a href="https://g.page/r/CWnSIgOkZnoGEAE/review" target="_blank" rel="noopener noreferrer" className="btn btn-google">
              <Icon name="edit-3" style={{ width: '18px', height: '18px' }} /> Write a Google Review
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq">
        <div className="container">
          <div className="section-title reveal">
            <span className="section-label">FAQ</span>
            <h2>Frequently Asked Questions</h2>
            <div className="section-divider"></div>
          </div>
          <div className="faq-list">
            <div className="faq-item reveal delay-1">
              <button className="faq-question" onClick={toggleFaq}>What courses does MBK Technology offer in Salem?<span className="faq-icon">+</span></button>
              <div className="faq-answer">
                <p>We offer Engineering (Civil, Mechanical, Electrical), AI, EV, Industry 4.0, Embedded Systems, and Corporate Excellence programs — all aligned with current industry standards.</p>
              </div>
            </div>
            <div className="faq-item reveal delay-2">
              <button className="faq-question" onClick={toggleFaq}>Does MBK Technology support Naan Mudhalvan?<span className="faq-icon">+</span></button>
              <div className="faq-answer">
                <p>Yes, we supply structured technical trainer deployment aligned with Naan Mudhalvan and government training standards, with complete documentation and quality tracking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RENDERED SECTIONS FOR SPA LAYOUT */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <LegacyServicesPage id="services" hideHero={true} />
        <AboutPage id="about" hideHero={true} />
        <LegacyContactPage id="contact" hideHero={true} />
      </div>

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
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
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

export default LegacyHomePage;

