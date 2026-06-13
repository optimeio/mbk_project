"use client";
// Force cache-invalidation refresh
import React, { useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { safeRouterPush } from '@/utils/safeRouterNavigation';
import {
    AcademicCapIcon,
    ArrowRightIcon,
    ArrowTopRightOnSquareIcon,
    Bars3Icon,
    BriefcaseIcon,
    BuildingOffice2Icon,
    CameraIcon,
    ChatBubbleLeftRightIcon,
    GlobeAltIcon,
    MapPinIcon,
    PhoneIcon,
    PlayCircleIcon,
    UserGroupIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import HeroSection from '@/features/auth/pages/HeroSection';
import CTAButton from '@/components/common/CTAButton';
import '@/features/auth/pages/LandingPage.css';

const LoginModal = dynamic(() => import('@/features/auth/components/LoginModal'), {
    ssr: false,
    loading: () => null,
});

const navItems = [
    { id: 'home', label: 'Home', target: 'hero-section' },
    { id: 'courses', label: 'Courses', route: '/about#courses' },
    { id: 'contact', label: 'Contact', target: 'footer-section' },
    { id: 'about', label: 'About', route: '/about' }
];

const registerCards = [
    {
        id: 'student',
        title: 'Student Register',
        description: 'Create your student profile for training batches, certification flow, and placement pipeline.',
        cta: 'Student Register',
        icon: UserGroupIcon,
        route: '/signup'
    },
    {
        id: 'trainer',
        title: 'Trainer Register',
        description: 'Join as a trainer and manage sessions, attendance, and skill development delivery.',
        cta: 'Trainer Register',
        icon: AcademicCapIcon,
        route: '/trainer-signup'
    },
    {
        id: 'company',
        title: 'Company Register',
        description: 'Register your company to manage hiring pipelines and business partner access.',
        cta: 'Company Register',
        icon: BuildingOffice2Icon,
        route: '/signup?type=company'
    }
];

const socialLinks = [
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/mbk-technology-ab40113b0/', icon: BriefcaseIcon },
    { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/mbktechnologysalem8/', icon: UserGroupIcon },
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/mbk_tech_digital/', icon: CameraIcon },
    { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@MbkTechnology8', icon: PlayCircleIcon },
    {
        id: 'justdial',
        label: 'Justdial',
        href: 'https://www.justdial.com/Salem/The-Mbk-Technologies-Fairlands-Police-Station-Opposite-Suramangalam/0427PX427-X427-241028223556-X2F9_BZDET',
        icon: MapPinIcon
    },
    { id: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/918807653965', icon: ChatBubbleLeftRightIcon }
];

const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'MBK Technology',
    url: 'https://www.mbktechnologies.info/',
    logo: 'https://www.mbktechnologies.info/img/mbk.png',
    telephone: '+918807653965',
    address: {
        '@type': 'PostalAddress',
        streetAddress: 'IInd Floor, OM Shiva Towers, 259-B, Advaitha Ashram Rd, Fairlands',
        addressLocality: 'Salem',
        addressRegion: 'Tamil Nadu',
        postalCode: '636004',
        addressCountry: 'IN'
    },
    sameAs: socialLinks.map((item) => item.href)
};

const LandingPageContent = ({ initialLoginOpen = false }) => {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(Boolean(initialLoginOpen));
    const [navigationLoading, setNavigationLoading] = useState(false);
    const [activeNavRoute, setActiveNavRoute] = useState(null);

    useEffect(() => {
        // If prop was set to open login initially, clean up the URL query param without causing cascading renders
        if (initialLoginOpen) {
            const url = new URL(window.location.href);
            url.searchParams.delete('login');
            const nextSearch = url.searchParams.toString();
            const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
            window.history.replaceState(null, '', nextUrl);
        }
    }, [initialLoginOpen]);

    const scrollTo = useCallback((targetId) => {
        const section = document.getElementById(targetId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMenuOpen(false);
    }, []);

    const handleRegisterNavigation = useCallback((route, type) => {
        console.log(`${type} Register Clicked`);
        console.log(`Navigation initiated to: ${route}`);
        setNavigationLoading(true);
        setActiveNavRoute(route);
        
        try {
            safeRouterPush(router, route);
        } catch (error) {
            console.error(`Navigation error for ${type} Register:`, error);
            setNavigationLoading(false);
            setActiveNavRoute(null);
        }
    }, [router]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [menuOpen]);

    const handleNavSelection = useCallback((item) => {
        if (item.route) {
            setMenuOpen(false);
            safeRouterPush(router, item.route);
            return;
        }

        scrollTo(item.target);
    }, [router, scrollTo]);

    return (
        <div className="landing-shell">
            <div className="landing-grid-overlay" aria-hidden="true" />
            <div className="landing-glow landing-glow-a" aria-hidden="true" />
            <div className="landing-glow landing-glow-b" aria-hidden="true" />

            <main className="landing-content" id="home-section">
                <nav className="top-nav" aria-label="Main Navigation">
                    <button type="button" className="brand" onClick={() => scrollTo('hero-section')}>
                        <Image
                            src="/mbk_tech_cyan.png"
                            alt="MBK Carrierz"
                            className="brand-logo"
                            width={48}
                            height={48}
                            priority
                            fetchPriority="high"
                            sizes="(max-width: 900px) 40px, 48px"
                        />
                        <span className="brand-text">MBK Carrierz</span>
                    </button>

                    <div className="nav-links" role="menubar">
                        {navItems.map((item) =>
                            item.route ? (
                                <Link
                                    key={item.id}
                                    href={item.route}
                                    className="nav-link"
                                    role="menuitem"
                                    aria-label={`Go to ${item.label} page`}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="nav-link"
                                    onClick={() => scrollTo(item.target)}
                                    role="menuitem"
                                    aria-label={`Scroll to ${item.label} section`}
                                >
                                    {item.label}
                                </button>
                            )
                        )}
                    </div>

                    <div className="nav-actions">
                        <CTAButton
                            href="/signup"
                            variant="brand"
                            size="sm"
                            aria-label="Open registration page"
                        >
                            Register
                        </CTAButton>
                        <CTAButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setLoginModalOpen(true)}
                            aria-label="Open login modal"
                        >
                            Login
                        </CTAButton>
                    </div>

                    <button
                        type="button"
                        className={`nav-menu-btn${menuOpen ? ' nav-menu-btn--open' : ''}`}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {menuOpen ? <XMarkIcon /> : <Bars3Icon />}
                    </button>
                </nav>

                {menuOpen ? (
                    <>
                        <button
                            type="button"
                            className="mobile-drawer-backdrop"
                            aria-label="Close navigation menu"
                            onClick={() => setMenuOpen(false)}
                        />
                        <aside
                            className="mobile-drawer"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Mobile navigation"
                        >
                            <div className="mobile-drawer-header">
                                <button
                                    type="button"
                                    className="mobile-drawer-brand"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        scrollTo('hero-section');
                                    }}
                                >
                                    <span className="mobile-drawer-logo-wrap">
                                        <Image
                                            src="/mbk_tech_cyan.png"
                                            alt=""
                                            className="mobile-drawer-logo"
                                            width={36}
                                            height={36}
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="mobile-drawer-brand-text">MBK Carrierz</span>
                                </button>
                                <button
                                    type="button"
                                    className="mobile-drawer-close"
                                    aria-label="Close menu"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <XMarkIcon />
                                </button>
                            </div>

                            <nav className="mobile-drawer-nav">
                                {navItems.map((item) => (
                                    <button
                                        key={`drawer-${item.id}`}
                                        type="button"
                                        className="mobile-drawer-link"
                                        onClick={() => handleNavSelection(item)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </nav>

                            <div className="mobile-drawer-actions">
                                <CTAButton
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    fullWidth
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setLoginModalOpen(true);
                                    }}
                                >
                                    Login
                                </CTAButton>
                                <CTAButton
                                    type="button"
                                    variant="brand"
                                    size="md"
                                    fullWidth
                                    onClick={() => {
                                        setMenuOpen(false);
                                        safeRouterPush(router, '/signup');
                                    }}
                                >
                                    Register
                                </CTAButton>
                            </div>
                        </aside>
                    </>
                ) : null}

                <HeroSection
                    onGetStarted={() => scrollTo('register-section')}
                    onLearnMore={() => scrollTo('register-section')}
                />

                <section id="register-section" className="section-block register-section" aria-label="Register Section">
                    <div className="section-head">
                        <h2>
                            <UserGroupIcon className="section-head-icon" />
                            Register Section
                        </h2>
                        <p>Choose your registration type: Student Register, Trainer Register, or Job Register.</p>
                    </div>

                    <div className="register-grid">
                        {registerCards.map((card) => {
                            const Icon = card.icon;
                            const isLoading = navigationLoading && activeNavRoute === card.route;
                            return (
                                <article key={card.id} className="register-card">
                                    <div className="register-icon-wrap">
                                        <Icon className="register-icon" />
                                    </div>
                                    <h3>{card.title}</h3>
                                    <p>{card.description}</p>
                                    <CTAButton
                                        type="button"
                                        variant="brand"
                                        size="md"
                                        fullWidth
                                        loading={isLoading}
                                        loadingText="Loading..."
                                        onClick={() => handleRegisterNavigation(card.route, card.title)}
                                        iconRight={!isLoading ? <ArrowTopRightOnSquareIcon className="h-4 w-4" /> : null}
                                        aria-label={`Navigate to ${card.title}`}
                                    >
                                        {card.cta}
                                    </CTAButton>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <footer id="footer-section" className="footer-section" aria-label="Footer Section">
                    <div className="footer-inner">
                        <div className="footer-grid">
                            <section className="footer-column">
                                <h4 className="footer-heading">MBK Technology</h4>
                                <div className="footer-column-content">
                                    <p className="footer-item">
                                        <MapPinIcon className="footer-item-icon" aria-hidden="true" />
                                        <span>IInd Floor, OM Shiva Towers, 259-B, Advaitha Ashram Rd, Fairlands, Salem, Tamil Nadu - 636004, India</span>
                                    </p>
                                    <p className="footer-item">
                                        <PhoneIcon className="footer-item-icon" aria-hidden="true" />
                                        <a href="tel:+918807653965">+91 88076 53965</a>
                                    </p>
                                    <p className="footer-item">
                                        <GlobeAltIcon className="footer-item-icon" aria-hidden="true" />
                                        <a href="https://www.mbktechnologies.info/" target="_blank" rel="noreferrer">
                                            www.mbktechnologies.info
                                        </a>
                                    </p>
                                </div>
                            </section>

                            <section className="footer-column">
                                <h4 className="footer-heading">Quick Register</h4>
                                <div className="footer-column-content">
                                    <p className="footer-link-row">
                                        <button
                                            type="button"
                                            onClick={() => handleRegisterNavigation('/signup', 'Student Register')}
                                            disabled={navigationLoading && activeNavRoute === '/signup'}
                                            className="footer-register-link"
                                            aria-label="Navigate to student registration"
                                        >
                                            <ArrowRightIcon className="footer-link-icon" aria-hidden="true" />
                                            Student Register
                                        </button>
                                    </p>
                                    <p className="footer-link-row">
                                        <button
                                            type="button"
                                            onClick={() => handleRegisterNavigation('/trainer-signup', 'Trainer Register')}
                                            disabled={navigationLoading && activeNavRoute === '/trainer-signup'}
                                            className="footer-register-link"
                                            aria-label="Navigate to trainer registration"
                                        >
                                            <ArrowRightIcon className="footer-link-icon" aria-hidden="true" />
                                            Trainer Register
                                        </button>
                                    </p>
                                    <p className="footer-link-row">
                                        <button
                                            type="button"
                                            onClick={() => handleRegisterNavigation('/signup?type=company', 'Company Register')}
                                            disabled={navigationLoading && activeNavRoute === '/signup?type=company'}
                                            className="footer-register-link"
                                            aria-label="Navigate to company registration"
                                        >
                                            <ArrowRightIcon className="footer-link-icon" aria-hidden="true" />
                                            Company Register
                                        </button>
                                    </p>
                                </div>
                            </section>

                            <section className="footer-column">
                                <h4 className="footer-heading">Support</h4>
                                <div className="footer-column-content">
                                    <p className="footer-item">
                                        <ChatBubbleLeftRightIcon className="footer-item-icon" aria-hidden="true" />
                                        <a href="https://wa.me/918807653965" target="_blank" rel="noreferrer">WhatsApp Support</a>
                                    </p>
                                    <p className="footer-item">
                                        <PlayCircleIcon className="footer-item-icon" aria-hidden="true" />
                                        <a href="https://www.youtube.com/@MbkTechnology8" target="_blank" rel="noreferrer">Official YouTube</a>
                                    </p>
                                </div>
                            </section>
                        </div>

                        <div className="footer-social-row" aria-label="Social links">
                            {socialLinks.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <a
                                        key={item.id}
                                        href={item.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`Open ${item.label}`}
                                        title={item.label}
                                    >
                                        <Icon className="footer-social-icon" aria-hidden="true" />
                                    </a>
                                );
                            })}
                        </div>

                        <p className="footer-copy">&copy; 2026 MBK Technology. All Rights Reserved.</p>
                    </div>
                </footer>

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
                />
            </main>
            {loginModalOpen && (
                <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
            )}
        </div>
    );
};

const LandingPage = ({ initialLoginOpen = false }) => {
  return <LandingPageContent initialLoginOpen={initialLoginOpen} />;
};

export default LandingPage;
