import { leadership } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';
import LeadershipCard from './LeadershipCard';
import SectionHeader from './SectionHeader';

export default function LeadershipSection() {
  return (
    <section className={`${styles.section} ${styles.leadershipSection}`} aria-labelledby="leadership-title">
      <SectionHeader
        id="leadership-title"
        eyebrow="Leadership Team"
        title="Meet Our Leadership"
        align="center"
      >
        Vision, operations, training excellence, and strategic growth are guided by leaders who bring MBK Technology's
        mission into real-world execution.
      </SectionHeader>

      <div className={styles.leadershipGrid}>
        {leadership.map((person) => (
          <LeadershipCard key={person.name} leader={person} />
        ))}
      </div>
    </section>
  );
}
