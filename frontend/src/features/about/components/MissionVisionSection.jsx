import { missionVision } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';
import MissionVisionCard from './MissionVisionCard';

export default function MissionVisionSection() {
  return (
    <section className={`${styles.section} ${styles.missionSection}`} aria-labelledby="mission-vision-title">
      <div className={styles.missionHeader}>
        <h2 id="mission-vision-title">Mission &amp; Vision</h2>
        <span className={styles.missionAccent} aria-hidden="true" />
      </div>

      <div className={styles.missionGrid}>
        {missionVision.map((item) => (
          <MissionVisionCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}
