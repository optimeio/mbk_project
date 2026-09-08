import Icon from '@/components/common/Icon';
import { overviewSignals } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';
import SectionHeader from './SectionHeader';

export default function AboutOverview() {
  return (
    <section className={styles.section} aria-labelledby="about-overview-title">
      <div className={styles.introGrid}>
        <div>
          <SectionHeader id="about-overview-title" eyebrow="Who We Are" title="An MBK training ecosystem built for measurable delivery">
            MBK Carrierz is more than a course catalog. It connects skill development, trainer coordination,
            documentation, attendance, and operational control so institutions can execute programs with clarity.
          </SectionHeader>

          <div className={styles.copyBlock}>
            <p>
              The portal supports the real work behind training delivery: batch planning, trainer processes, evidence
              collection, document movement, approvals, and visibility for the people responsible for outcomes.
            </p>
            <p>
              This About page preserves the premium MBK public-facing experience while presenting the system as a
              dependable operations platform for colleges, organizations, trainers, and internal teams.
            </p>
          </div>
        </div>

        <div className={styles.introStack} aria-label="MBK operating signals">
          {overviewSignals.map((item) => (
            <article key={item.title} className={styles.identityCard}>
              <span className={styles.iconBadge}>
                <Icon name={item.icon} />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
