import styles from '../pages/AboutPage.module.css';

export default function JourneyMilestoneCard({ milestone, index }) {
  const positionClass = index % 2 === 0 ? styles.timelineItemTop : styles.timelineItemBottom;

  return (
    <article className={`${styles.timelineItem} ${positionClass}`}>
      <span className={styles.timelineConnector} aria-hidden="true" />
      <span className={styles.timelineNode} aria-hidden="true">
        <span />
      </span>

      <div className={styles.milestoneCard}>
        <span className={styles.milestoneYear}>{milestone.year}</span>
        <h3>{milestone.title}</h3>
        <p>{milestone.description}</p>
      </div>
    </article>
  );
}
