"use client";

import AboutCTA from '../components/AboutCTA';
import AboutHero from '../components/AboutHero';
import AboutOverview from '../components/AboutOverview';
import AboutPortalShell from '../components/AboutPortalShell';
import CoursesSection from '../components/CoursesSection';
import JourneySection from '../components/JourneySection';
import LeadershipSection from '../components/LeadershipSection';
import MissionVisionSection from '../components/MissionVisionSection';
import StrengthsSection from '../components/StrengthsSection';
import styles from './AboutPage.module.css';

export default function AboutPage({ id = 'about' }) {
  return (
    <AboutPortalShell>
      <main id={id} className={styles.aboutPage}>
        <div className={styles.shell}>
          <AboutHero />
          <AboutOverview />
          <CoursesSection />
          <JourneySection />
          <MissionVisionSection />
          <LeadershipSection />
          <StrengthsSection />
          <AboutCTA />
        </div>
      </main>
    </AboutPortalShell>
  );
}
