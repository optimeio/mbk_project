import Icon from '@/components/common/Icon';
import { strengths } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';
import SectionHeader from './SectionHeader';

export default function StrengthsSection() {
  return (
    <section className={`${styles.section} ${styles.strengthsSection}`} aria-labelledby="strengths-title">
      <div className={styles.strengthsGrid}>
        <div>
          <SectionHeader id="strengths-title" eyebrow="Why Choose Us" title="Strengths that make MBK delivery dependable">
            The About experience now communicates both sides of MBK: premium skill development and the operating depth
            needed to run programs at institutional scale.
          </SectionHeader>
        </div>

        <div className={styles.reasonGrid}>
          {strengths.map((item) => (
            <article key={item.title} className={styles.reasonCard}>
              <span className={styles.iconBadge}>
                <Icon name={item.icon} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
