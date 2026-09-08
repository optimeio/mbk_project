import Link from 'next/link';
import { courses } from '../data/aboutContent';
import styles from '../pages/AboutPage.module.css';
import CourseCard from './CourseCard';
import SectionHeader from './SectionHeader';

export default function CoursesSection() {
  return (
    <section id="courses" className={`${styles.section} ${styles.coursesSection}`} aria-labelledby="courses-title">
      <SectionHeader
        id="courses-title"
        eyebrow="Explore Programs"
        title="Courses"
        align="center"
      >
        Explore premium MBK programs built for practical learning, career readiness, and real-world technical execution.
      </SectionHeader>

      <div className={styles.courseGrid}>
        {courses.map((course) => (
          <CourseCard key={course.title} course={course} />
        ))}
      </div>

      <div className={styles.coursesViewAll}>
        <Link href="/courses" className={styles.coursesViewAllButton}>
          View All Courses
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
