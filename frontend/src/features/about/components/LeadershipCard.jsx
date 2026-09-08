"use client";

import Image from 'next/image';
import { useState } from 'react';
import styles from '../pages/AboutPage.module.css';

export default function LeadershipCard({ leader }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(leader.image && !imageFailed);

  return (
    <article className={styles.leadershipCard}>
      <div className={styles.leaderAvatarWrap}>
        <div className={styles.leaderAvatar}>
          {showImage ? (
            <Image
              src={leader.image}
              alt={`${leader.name}, ${leader.role}`}
              fill
              sizes="132px"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.leaderFallback} role="img" aria-label={`${leader.name} portrait fallback`}>
              {leader.initials}
            </span>
          )}
        </div>
      </div>

      <div className={styles.leadershipBody}>
        <h3>{leader.name}</h3>
        <p className={styles.leaderRole}>{leader.role}</p>

        <div className={styles.leaderTags} aria-label={`${leader.name} leadership focus`}>
          {leader.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <q className={styles.leaderQuote}>{leader.quote}</q>
        <p className={styles.leaderBio}>{leader.bio}</p>
      </div>
    </article>
  );
}
