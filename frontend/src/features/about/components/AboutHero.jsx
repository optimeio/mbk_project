import Image from 'next/image';
import Icon from '@/components/common/Icon';
import CTAButton from '@/components/common/CTAButton';
import { heroFacts, heroHighlights } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';

export default function AboutHero() {
  return (
    <section className={styles.hero} aria-labelledby="about-hero-title">
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy} data-animate="rise">
          <span className={styles.kicker}>About MBK Carrierz</span>
          <h1 id="about-hero-title">Training, operations, and execution in one connected MBK platform.</h1>
          <p>
            MBK Carrierz brings industry-aligned courses, trainer coordination, documentation, attendance, and portal
            visibility into a practical operating model for institutions, learners, and execution teams.
          </p>

          <div className={styles.factList} aria-label="MBK strengths">
            {heroFacts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>

          <div className={styles.heroActions}>
            <CTAButton
              href="#courses"
              variant="brand"
              size="md"
              iconLeft={<Icon name="book-open-check" />}
            >
              Explore Courses
            </CTAButton>
            <CTAButton
              href="#about-contact"
              variant="secondary"
              size="md"
              iconLeft={<Icon name="message-circle" />}
            >
              Contact MBK
            </CTAButton>
          </div>
        </div>

        <aside className={styles.heroPanel} aria-label="MBK operating model" data-animate="lift">
          <div className={styles.heroVisualCard}>
            <div className={styles.heroImageWrap}>
              <Image
                src="/logos/mbkcarrieZ.png"
                alt="MBK CarrierZ Skills to Success brand artwork"
                fill
                sizes="(max-width: 900px) 100vw, 480px"
                priority
              />
            </div>
            <div className={styles.visualSummary}>
              <span>Core execution stack</span>
              <strong>Courses, trainers, documents, dashboards</strong>
            </div>
          </div>

          <div className={styles.heroPanelList}>
            {heroHighlights.map((item) => (
              <article key={item.title} className={styles.heroPanelItem}>
                <span className={styles.iconBadge}>
                  <Icon name={item.icon} />
                </span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
