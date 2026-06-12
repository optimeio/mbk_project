import styles from '../pages/AboutPage.module.css';

export default function SectionHeader({ eyebrow, title, children, align = 'left', id }) {
  return (
    <div className={`${styles.sectionHeader} ${align === 'center' ? styles.sectionHeaderCenter : ''}`}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2 id={id}>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
