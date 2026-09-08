"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import CTAButton from '@/components/common/CTAButton';
import '@/features/auth/pages/hero.css';

const Orb = dynamic(() => import('@/components/common/Orb'), {
    ssr: false,
    loading: () => <div className="rb-hero-orb-fallback" aria-hidden="true" />,
});

const HeroSection = ({ onGetStarted, onLearnMore }) => {
    const [canRenderOrb, setCanRenderOrb] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const renderOrb = () => setCanRenderOrb(true);
        if ('requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(renderOrb, { timeout: 1400 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = window.setTimeout(renderOrb, 700);
        return () => window.clearTimeout(timeoutId);
    }, []);

    return (
    <section id="hero-section" className="rb-hero-shell" aria-label="Hero Section">
        <div className="rb-hero-canvas" aria-hidden="true">
            {canRenderOrb ? (
                <Orb
                    hoverIntensity={2.35}
                    rotateOnHover={true}
                    hue={25}
                    forceHoverState={false}
                    backgroundColor="#5c2e0e"
                />
            ) : (
                <div className="rb-hero-orb-fallback" aria-hidden="true" />
            )}
        </div>

        <div className="rb-hero-content">
            <h1>MBK Carrierz will create the future for you!</h1>
            <div className="rb-hero-cta-row">
                <CTAButton
                  type="button"
                  variant="brand"
                  size="lg"
                  className="rb-hero-cta rb-hero-cta-primary"
                  onClick={onGetStarted}
                >
                    Get Started
                </CTAButton>
                <CTAButton
                  type="button"
                  variant="outline"
                  size="lg"
                  className="rb-hero-cta rb-hero-cta-secondary"
                  onClick={onLearnMore}
                >
                    Learn More
                </CTAButton>
            </div>
        </div>
    </section>
    );
};

export default HeroSection;
