import Icon from '@/components/common/Icon';
import CTAButton from '@/components/common/CTAButton';
import { contactChannels } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';

export default function AboutCTA() {
  return (
    <section id="about-contact" className={styles.ctaSection} aria-labelledby="about-cta-title">
      <div className={styles.ctaBand}>
        <div className={styles.ctaCopy}>
          <span className={styles.eyebrow}>CTA / Contact</span>
          <h2 id="about-cta-title">Talk to MBK about courses, trainer operations, or portal-backed delivery.</h2>
          <p>
            Connect with the team for institutional training, course programs, trainer deployment, documentation
            workflows, or operational visibility through the MBK portal.
          </p>

          <div className={styles.contactList} aria-label="MBK contact channels">
            {contactChannels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <Icon name={channel.icon} />
                <span>
                  <strong>{channel.label}</strong>
                  {channel.value}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className={styles.ctaActions}>
          <CTAButton
            href="https://wa.me/918807653965?text=Hello%20MBK%20Technology,%20I%20am%20interested%20in%20your%20courses%20and%20institutional%20training%20support."
            variant="success"
            size="md"
            iconLeft={<Icon name="message-circle" />}
          >
            WhatsApp MBK
          </CTAButton>
          <CTAButton
            href="/?login=true"
            variant="secondary"
            size="md"
            iconLeft={<Icon name="log-in" />}
          >
            Open Portal
          </CTAButton>
        </div>
      </div>
    </section>
  );
}
