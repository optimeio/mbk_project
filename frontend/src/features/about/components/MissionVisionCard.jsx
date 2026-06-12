import Icon from '@/components/common/Icon';
import styles from '../pages/AboutPage.module.css';

export default function MissionVisionCard({ item }) {
  const accentClass = item.type === 'vision' ? styles.missionCardVision : styles.missionCardMission;

  return (
    <article className={`${styles.missionCard} ${accentClass}`}>
      <span className={styles.missionIcon} aria-hidden="true">
        <Icon name={item.icon} />
      </span>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </article>
  );
}
