"use client";

import Icon from '@/components/common/Icon';
import CTAButton from '@/components/common/CTAButton';
import { useEffect, useState } from 'react';
import axios from 'axios';

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

function LegacyContactPage({ id, hideHero }) {
  const [formState, setFormState] = useState('idle'); // idle, sending, success

  useEffect(() => {
    // Reveal Observer
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

    // Particles (Background)
    const canvas = !hideHero ? document.getElementById('particle-canvas') : null;
    let animationId;
    let handleResize = null;
    
    if (canvas) {
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

      function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(W, H); p.draw(ctx); });
        connectParticles();
        animationId = requestAnimationFrame(animate);
      }
      animate();

      handleResize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (handleResize) window.removeEventListener('resize', handleResize);
      revealObserver.disconnect();
    };
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormState('sending');
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      await axios.post('/api/web/contact', data);
      setFormState('success');
      e.target.reset();
      setTimeout(() => setFormState('idle'), 5000);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Error sending message. Please try WhatsApp directly.');
      setFormState('idle');
    }
  };

  return (
    <main id={id}>
      {!hideHero && (
        <>
                    <canvas id="particle-canvas" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}></canvas>
        </>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .contact-card-mini { background: var(--card-gradient); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 2rem; display: flex; alignItems: flex-start; gap: 1.2rem; transition: var(--transition); }
        .contact-card-mini:hover { border-color: rgba(249, 115, 22, 0.28); transform: translateY(-5px); box-shadow: var(--shadow-card); }
        .contact-card-mini-icon { width: 50px; height: 50px; flex-shrink: 0; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(249, 115, 22, 0.22); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .contact-card-mini h4 { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 0.5rem; }
        .contact-card-mini p { font-size: 0.9rem; color: var(--text-soft); line-height: 1.65; }
        .contact-mini-link { font-size: 0.82rem; color: var(--primary); font-weight: 600; margin-top: 0.5rem; display: inline-block; transition: var(--transition); }
        .contact-mini-link:hover { transform: translateX(4px); }
        .contact-main-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 3rem; align-items: start; }
        select option { background: #0d0d1a; color: var(--text-main); }
        select optgroup { color: var(--text-muted); font-size: 0.82rem; }
        
        @media (max-width: 900px) {
            .contact-main-grid { grid-template-columns: 1fr; }
            .contact-card-mini { flex-direction: column; }
        }
        @media (max-width: 600px) {
            .contact-top-grid { grid-template-columns: 1fr !important; }
            .contact-main-grid form > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
      
      {/* HERO */}
      {!hideHero && (
        <header className="hero" style={{ minHeight: '52vh', paddingTop: '9rem', paddingBottom: '3rem' }}>
          <div className="hero-bg">
              <div className="hero-orb hero-orb-1"></div>
              <div className="hero-orb hero-orb-2"></div>
              <div className="hero-grid"></div>
          </div>
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
              <div className="hero-badge" style={{ animation: 'fadeInDown 0.8s ease forwards' }}>
                  <span className="dot"></span>We'd Love to Hear From You
              </div>
              <h1 className="reveal"
                  style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 900, background: 'linear-gradient(160deg,#fff 0%,#e2e8f0 40%,#94a3b8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px', marginBottom: '1.2rem' }}>
                  Contact MBK Technology</h1>
              <p className="reveal delay-1"
                  style={{ fontSize: '1.12rem', color: 'var(--text-muted)', maxWidth: '560px', lineHeight: 1.85 }}>
                  Reach out for Admissions, Institutional Training &amp; Corporate Services. We typically respond within 5 minutes on WhatsApp.</p>
          </div>
        </header>
      )}

      {/* MAIN CONTACT FORM + INFO */}
      <section style={{ paddingTop: '2rem' }}>
        <div className="container">
            <div className="contact-main-grid">

                {/* LEFT: Form */}
                <div className="reveal">
                    <div className="contact-form-wrap">
                        <div style={{ marginBottom: '2.5rem' }}>
                            <span className="section-label">Send a Message</span>
                            <h2 style={{ fontSize: '1.9rem', marginTop: '0.8rem', marginBottom: '0.6rem', background: 'linear-gradient(135deg,var(--text-main),var(--text-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.4px' }}>
                                Get In Touch</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>Fill the form below and we'll respond within 24 hours.</p>
                        </div>
                        <form id="contact-form" noValidate onSubmit={handleFormSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                                <div className="form-group">
                                    <label htmlFor="cf-name">Full Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                                    <input type="text" id="cf-name" name="name" placeholder="e.g. Arjun Kumar" required autoComplete="name" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cf-phone">Phone Number <span style={{ color: 'var(--primary)' }}>*</span></label>
                                    <input type="tel" id="cf-phone" name="phone" placeholder="+91 98765 43210" required autoComplete="tel" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="cf-email">Email Address <span style={{ color: 'var(--primary)' }}>*</span></label>
                                <input type="email" id="cf-email" name="email" placeholder="yourname@email.com" required autoComplete="email" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cf-interest">Interested In <span style={{ color: 'var(--primary)' }}>*</span></label>
                                <select id="cf-interest" name="interest" required defaultValue="">
                                    <option value="" disabled>— Select a program or service —</option>
                                    <optgroup label="Engineering Programs">
                                        <option value="Civil Engineering – Smart Infrastructure">Civil Engineering – Smart Infrastructure</option>
                                        <option value="Mechanical Engineering – Industry 4.0">Mechanical Engineering – Industry 4.0</option>
                                        <option value="EV & Future Mobility">EV &amp; Future Mobility</option>
                                        <option value="Computer Science & IT">Computer Science &amp; IT</option>
                                        <option value="Electrical / ECE Programs">Electrical / ECE Programs</option>
                                    </optgroup>
                                    <optgroup label="Institutional Services">
                                        <option value="Institutional Trainer Deployment">Institutional Trainer Deployment</option>
                                        <option value="Naan Mudhalvan Program">Naan Mudhalvan Program</option>
                                        <option value="Corporate Skill Development">Corporate Skill Development</option>
                                    </optgroup>
                                    <option value="Other / General Inquiry">Other / General Inquiry</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="cf-institution">College / Company Name</label>
                                <input type="text" id="cf-institution" name="institution" placeholder="Your institution or company (optional)" autoComplete="organization" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cf-message">Your Message <span style={{ color: 'var(--primary)' }}>*</span></label>
                                <textarea id="cf-message" name="message" rows="4" placeholder="Tell us how we can help you..." required></textarea>
                            </div>
                            
                            <CTAButton
                                type="submit"
                                id="form-submit-btn"
                                variant={formState === 'success' ? 'success' : 'brand'}
                                size="lg"
                                fullWidth
                                disabled={formState !== 'idle'}
                                loading={formState === 'sending'}
                                loadingText="Sending..."
                                iconLeft={formState === 'idle' ? <Icon name="send" style={{ width: '18px', height: '18px' }} /> : formState === 'success' ? <Icon name="check" style={{ width: '18px', height: '18px' }} /> : null}
                            >
                                {formState === 'success' ? 'Message Sent!' : 'Send Message'}
                            </CTAButton>
                            
                            {formState === 'success' && (
                                <div id="form-success" style={{ marginTop: '1.2rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.4rem', color: '#4ade80', fontSize: '0.93rem', textAlign: 'center' }}>
                                    ✅ Message sent! We'll get back to you within 24 hours.
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* RIGHT: Info + Map */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Quick Connect */}
                    <div className="contact-info-card reveal delay-1">
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1.8rem', color: 'var(--text-main)' }}>Quick Connect</h3>
                        <a href="https://maps.google.com/?q=MBK+Technology+Salem" target="_blank" rel="noopener noreferrer" className="contact-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="contact-icon"><Icon name="map-pin" style={{ width: '20px', height: '20px' }} /></div>
                            <div>
                                <h4>Address</h4>
                                <p style={{ color: 'var(--text-muted)' }}>259-B, III Floor, OM Shiva Towers<br />Near DNC Mall, Fairlands<br />Salem, Tamil Nadu – 636004</p>
                            </div>
                        </a>
                        <a href="tel:+918807653965" className="contact-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="contact-icon" style={{ background: 'rgba(37,211,102,0.1)', borderColor: 'rgba(37,211,102,0.25)', color: '#25d366' }}>
                                <Icon name="phone" style={{ width: '20px', height: '20px' }} />
                            </div>
                            <div>
                                <h4>Direct Call</h4>
                                <p style={{ color: '#25d366', fontWeight: 600 }}>+91 88076 53965</p>
                            </div>
                        </a>
                        <a href="mailto:mbktechnologies8@gmail.com" className="contact-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="contact-icon" style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.25)', color: 'var(--accent)' }}>
                                <Icon name="mail" style={{ width: '20px', height: '20px' }} />
                            </div>
                            <div>
                                <h4>Email</h4>
                                <p style={{ color: 'var(--accent)' }}>mbktechnologies8@gmail.com</p>
                            </div>
                        </a>
                        <div className="contact-item" style={{ borderBottom: 'none' }}>
                            <div className="contact-icon" style={{ background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }}>
                                <Icon name="clock" style={{ width: '20px', height: '20px' }} />
                            </div>
                            <div>
                                <h4>Working Hours</h4>
                                <p>Mon – Sat: 9:00 AM – 6:00 PM</p>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp CTA */}
                    <div className="reveal delay-2" style={{ background: 'linear-gradient(135deg,rgba(37,211,102,0.08),rgba(18,140,126,0.08))', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#25d366,#128c7e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 6px 20px rgba(37,211,102,0.3)' }}>
                            <Icon name="message-square" style={{ width: '24px', height: '24px', color: 'white' }} />
                        </div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Fastest Response on WhatsApp</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.4rem', lineHeight: 1.65 }}>
                            Typically reply within 5 minutes for admissions &amp; partnerships.</p>
                        <CTAButton
                            href="https://wa.me/918807653965?text=Hello%20MBK%20TECHNOLOGY,%20I%20am%20interested%20in%20your%20programs."
                            variant="success"
                            size="lg"
                            fullWidth
                            iconLeft={<Icon name="message-circle" style={{ width: '18px', height: '18px' }} />}
                        >
                            Open WhatsApp Chat
                        </CTAButton>
                    </div>
                </div>

            </div>
        </div>
      </section>
    </main>
  );
}

export default LegacyContactPage;

