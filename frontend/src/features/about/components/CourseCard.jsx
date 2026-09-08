"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/common/Icon';
import styles from '../pages/AboutPage.module.css';

export default function CourseCard({ course }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(course.image && !imageFailed);

  return (
    <article className={styles.courseCard}>
      <div className={styles.courseImageWrap}>
        {showImage ? (
          <Image
            src={course.image}
            alt={`${course.title} course banner`}
            fill
            sizes="(max-width: 620px) 100vw, (max-width: 1100px) 50vw, 33vw"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={styles.courseImageFallback} role="img" aria-label={`${course.title} image placeholder`}>
            <Icon name="book-open-check" />
            <span>MBK Course</span>
          </div>
        )}
        <span className={styles.courseImageOverlay} aria-hidden="true" />
      </div>

      <div className={styles.courseBody}>
        <h3>{course.title}</h3>
        <p>{course.description}</p>

        <div className={styles.courseActions}>
          <Link className={styles.courseDetailsButton} href={course.detailsHref}>
            Details
          </Link>
          <Link className={styles.courseRegisterButton} href={course.registerHref}>
            Register
          </Link>
        </div>
      </div>
    </article>
  );
}
