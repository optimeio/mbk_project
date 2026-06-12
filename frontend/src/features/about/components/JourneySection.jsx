import { journey } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';
import JourneyMilestoneCard from './JourneyMilestoneCard';
import SectionHeader from './SectionHeader';

export default function JourneySection() {
  return (
    <section className={`${styles.section} ${styles.journeySection}`} aria-labelledby="journey-title">
      <div className={styles.journeyHeader}>
        <SectionHeader id="journey-title" eyebrow="EVOLUTIONARY PATH" title="Our Journey" align="center" />
        <span className={styles.journeyAccent} aria-hidden="true" />
        <p className={styles.journeyLead}>
          From Salem-based beginnings to institution-ready scale, MBK Technology has grown through skill delivery,
          digital transformation, strategic partnerships, and global readiness.
        </p>
      </div>

      <div className={styles.timeline} aria-label="MBK Technology journey timeline">
        {journey.map((item, index) => (
          <JourneyMilestoneCard key={item.year} milestone={item} index={index} />
        ))}
      </div>
    </section>
  );
}
