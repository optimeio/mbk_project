"use client";

import Icon from '@/components/common/Icon';
import CTAButton from '@/components/common/CTAButton';
import { useEffect } from 'react';

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

function LegacyServicesPage({ id, hideHero }) {
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

    // Counters
    const counters = document.querySelectorAll('.counter-num');
    const counterObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = +entry.target.getAttribute('data-target');
          const suffix = entry.target.getAttribute('data-suffix') || '';
          const duration = 2000;
          const stepTime = Math.abs(Math.floor(duration / target));
          let start = 0;
          const timer = setInterval(() => {
            start += target > 1000 ? Math.ceil(target / 100) : 1;
            if (start > target) start = target;
            entry.target.innerText = start + suffix;
            if (start === target) clearInterval(timer);
          }, stepTime);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObs.observe(c));

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (handleResize) window.removeEventListener('resize', handleResize);
      revealObserver.disconnect();
      counterObs.disconnect();
    };
  }, []);

  return (
    <main id={id}>
      {!hideHero && (
        <>
                    <canvas id="particle-canvas" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}></canvas>
        </>
      )}
      <style>{`
        .check-list { list-style: none; padding: 0; }
        .check-list li { position: relative; padding-left: 1.5rem; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted); }
        .check-list li::before { content: '✓'; position: absolute; left: 0; color: var(--primary); font-weight: 900; }
        .impact-stat { padding: 2.5rem; border-radius: var(--radius-md); background: var(--glass); border: 1px solid var(--border); transition: var(--transition); }
        .impact-stat:hover { border-color: rgba(249, 115, 22, 0.3); transform: scale(1.05); box-shadow: var(--shadow-glow); }
        @media (max-width: 768px) {
            .impact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* HERO */}
      {!hideHero && (
        <header className="hero" style={{ minHeight: '52vh', paddingTop: '9rem', paddingBottom: '4rem' }}>
          <div className="hero-bg">
              <div className="hero-orb hero-orb-1"></div>
              <div className="hero-orb hero-orb-2"></div>
              <div className="hero-grid"></div>
          </div>
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
              <div className="hero-badge" style={{ animation: 'fadeInDown 0.8s ease forwards' }}>
                  <span className="dot"></span>Government &amp; Institutional Partner
              </div>
              <h1 className="reveal"
                  style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 900, background: 'linear-gradient(160deg,#fff 0%,#e2e8f0 40%,#94a3b8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px', marginBottom: '1.2rem' }}>
                  Institutional Trainer Deployment</h1>
              <p className="reveal delay-1"
                  style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '620px', lineHeight: 1.85 }}>
                  Structured, scalable, and quality-driven training solutions for colleges, universities, and state-level government initiatives like Naan Mudhalvan.
              </p>
          </div>
        </header>
      )}

      {/* KEY SERVICES GRID */}
      <section style={{ paddingTop: hideHero ? '2rem' : '5rem' }}>
        <div className="container">
            <div className="section-title reveal">
                <span className="section-label">State-Level Reach</span>
                <h2>Scalable Deployment Services</h2>
                <div className="section-divider"></div>
                <p>We solve the challenge of technical trainer availability by providing a verified network of domain experts ready for deployment.</p>
            </div>
            <div className="grid">
                <div className="card reveal delay-1">
                    <div className="card-icon"><Icon name="users-2" /></div>
                    <h3>Technical Trainer Supply</h3>
                    <p style={{ marginBottom: '1.2rem' }}>We maintain a verified network of qualified technical trainers across Tamil Nadu, ready for rapid deployment in urban and rural locations.</p>
                    <ul className="check-list">
                        <li>Domain-Specific Experts</li>
                        <li>Certified Technical Skillsets</li>
                        <li>Verified Teaching Experience</li>
                        <li>Background Verified Professionals</li>
                    </ul>
                </div>
                <div className="card reveal delay-2">
                    <div className="card-icon"><Icon name="clipboard-check" /></div>
                    <h3>Quality &amp; Tracking</h3>
                    <p style={{ marginBottom: '1.2rem' }}>Every training session is monitored with rigorous attendance and quality tracking systems to ensure compliance with institutional standards.</p>
                    <ul className="check-list">
                        <li>Daily Attendance Tracking</li>
                        <li>Student Feedback Collection</li>
                        <li>Learning Outcome Assessment</li>
                        <li>Real-time Progress Reporting</li>
                    </ul>
                </div>
                <div className="card reveal delay-3">
                    <div className="card-icon"><Icon name="layers" /></div>
                    <h3>Multi-Batch Capability</h3>
                    <p style={{ marginBottom: '1.2rem' }}>Proven track record in managing up to 100+ concurrent batches across multiple campuses simultaneously without compromising quality.</p>
                    <ul className="check-list">
                        <li>Centralized Management System</li>
                        <li>Backup Trainer Readiness</li>
                        <li>Logistics &amp; Scheduling Control</li>
                        <li>Multi-College Coordination</li>
                    </ul>
                </div>
                <div className="card reveal delay-4">
                    <div className="card-icon"><Icon name="file-text" /></div>
                    <h3>Government Compliance</h3>
                    <p style={{ marginBottom: '1.2rem' }}>Fully aligned with Naan Mudhalvan and other TNSDC protocols, providing all necessary documentation for government audits.</p>
                    <ul className="check-list">
                        <li>Naan Mudhalvan Standards</li>
                        <li>Audit-Ready Documentation</li>
                        <li>Govt. Portal Data Entry</li>
                        <li>Skill Certificate Management</li>
                    </ul>
                </div>
            </div>
        </div>
      </section>

      {/* OPERATIONAL WORKFLOW */}
      <section style={{ background: 'rgba(249,115,22,0.03)', borderTop: '1px solid rgba(249,115,22,0.08)', borderBottom: '1px solid rgba(249,115,22,0.08)' }}>
        <div className="container">
            <div className="section-title reveal">
                <span className="section-label">Our Process</span>
                <h2>Engagement Workflow</h2>
                <div className="section-divider"></div>
                <p>A systematic approach to ensuring successful deployment and measurable training outcomes.</p>
            </div>
            <div className="process-steps">
                <div className="process-step reveal delay-1">
                    <div className="step-num">01</div>
                    <h3>Requirement Analysis</h3>
                    <p>We analyze the domain, batch count, and scheduling requirements of the institution.</p>
                </div>
                <div className="process-step reveal delay-2">
                    <div className="step-num">02</div>
                    <h3>Trainer Selection</h3>
                    <p>Matching the right subject matter experts from our network to the specific domain needs.</p>
                </div>
                <div className="process-step reveal delay-3">
                    <div className="step-num">03</div>
                    <h3>Deployment &amp; Onboarding</h3>
                    <p>Trainers are deployed to campuses with a clear syllabus, material, and tracking protocol.</p>
                </div>
                <div className="process-step reveal delay-4">
                    <div className="step-num">04</div>
                    <h3>Monitoring &amp; Audit</h3>
                    <p>Continuous quality checks and documentation updates throughout the training duration.</p>
                </div>
            </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section>
        <div className="container">
            <div className="section-title reveal">
                <span className="section-label">Institutional Impact</span>
                <h2>Trusted by Leading Colleges</h2>
                <div className="section-divider"></div>
                <p>We work with colleges across Tamil Nadu to deliver high-impact engineering and IT skill modules.</p>
            </div>
            <div className="impact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', textAlign: 'center' }}>
                <div className="impact-stat reveal delay-1">
                    <span className="stat-num counter-num" data-target="50" data-suffix="+">0+</span>
                    <span className="stat-label">Colleges Partnered</span>
                </div>
                <div className="impact-stat reveal delay-2">
                    <span className="stat-num counter-num" data-target="100" data-suffix="+">0+</span>
                    <span className="stat-label">Trainers Deployed</span>
                </div>
                <div className="impact-stat reveal delay-3">
                    <span className="stat-num counter-num" data-target="5000" data-suffix="+">0+</span>
                    <span className="stat-label">Students Impacted</span>
                </div>
            </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 0', background: 'linear-gradient(135deg,rgba(139,92,246,0.07),rgba(249,115,22,0.07))' }}>
        <div className="container" style={{ textAlign: 'center' }}>
            <div className="reveal">
                <span className="section-label">Institutional Tie-up</span>
                <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', margin: '1.2rem 0', background: 'linear-gradient(135deg,var(--text-main),var(--text-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                    Start a Partnership Today</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
                    Secure high-quality technical trainers for your upcoming batches with MBK Technology's reliable deployment model.</p>
                <div style={{ display: 'flex', gap: '1.1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <CTAButton
                        href="https://wa.me/918807653965?text=Hello%20MBK%20TECHNOLOGY,%20I'm%20interested%20in%20institutional%20partnership."
                        variant="brand"
                        size="lg"
                        iconLeft={<Icon name="message-circle" style={{ width: '18px', height: '18px' }} />}
                    >
                        Partner with Us
                    </CTAButton>
                    <CTAButton
                        href="/contact"
                        variant="outline"
                        size="lg"
                        iconLeft={<Icon name="mail" style={{ width: '18px', height: '18px' }} />}
                    >
                        Request a Proposal
                    </CTAButton>
                </div>
            </div>
        </div>
      </section>
    </main>
  );
}

export default LegacyServicesPage;

