"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Play, Pause, FileText, Download } from 'lucide-react';
import { buildOptimizedImageUrl } from '../../utils/cloudinary';

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?|#|$)/i;
const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|mkv|m4v|3gp|ogv)(\?|#|$)/i;
const AUDIO_FILE_PATTERN = /\.(mp3|m4a|aac|wav|ogg|oga|weba|opus)(\?|#|$)/i;

const resolveAudioSource = (attachment) =>
  String(attachment?.asset_url || attachment?.audio_url || '').trim();

const isLikelyAudioSource = (source, mimeType) => {
  const normalizedSource = String(source || '').toLowerCase();
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  const looksLikeImage = IMAGE_FILE_PATTERN.test(normalizedSource);
  const looksLikeVideo = VIDEO_FILE_PATTERN.test(normalizedSource);
  const looksLikeAudio = AUDIO_FILE_PATTERN.test(normalizedSource);

  // URL signatures should win over an overly-generic/incorrect mime_type.
  if (looksLikeImage || looksLikeVideo) {
    return false;
  }

  if (normalizedMimeType.startsWith('audio/')) {
    return true;
  }

  return looksLikeAudio;
};

export function AudioMessage({ at, isMine, isDark, themes: K }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(at.duration || 0);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const audioRef = useRef(null);
  const audioSource = resolveAudioSource(at);
  const canPlayAudio = Boolean(
    !hasPlaybackError
    && audioSource
    && isLikelyAudioSource(audioSource, at?.mime_type),
  );

  useEffect(() => {
    setHasPlaybackError(false);
  }, [audioSource]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (!at.duration && audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
         setAudioDuration(audio.duration);
      }
    };

    const setAudioTime = () => {
      const d = audioDuration || audio.duration;
      if (d) {
         setProgress((audio.currentTime / d) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    if (audio.readyState > 0) setAudioData();

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioDuration, at.duration]);

  const toggle = () => {
    if (!audioRef.current || !canPlayAudio) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const playTask = audioRef.current.play();
    if (playTask && typeof playTask.catch === 'function') {
      playTask
        .then(() => setIsPlaying(true))
        .catch((error) => {
          const errorName = String(error?.name || '');
          if (errorName !== 'NotSupportedError' && errorName !== 'AbortError') {
            console.warn('Unable to play audio attachment:', error);
          }
          setHasPlaybackError(true);
          setIsPlaying(false);
        });
      return;
    }

    setIsPlaying(true);
  };

  const dur = audioDuration || at.duration;
  const durationStr = dur ? `${Math.floor(dur / 60)}:${(Math.floor(dur) % 60).toString().padStart(2, '0')}` : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', minWidth: 240 }}>
      <button
        onClick={toggle}
        disabled={!canPlayAudio}
        title={!canPlayAudio ? 'Audio source unavailable' : 'Play audio'}
        style={{ width: 40, height: 40, borderRadius: '50%', background: isMine ? 'rgba(255,255,255,0.1)' : 'rgba(0,168,132,0.1)', border: 'none', cursor: canPlayAudio ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMine ? (isDark ? '#e9edef' : '#111b21') : (isDark ? '#00a884' : '#00a884'), opacity: canPlayAudio ? 1 : 0.55 }}
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 3 }} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 3, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 2, position: 'relative' }}>
          <div
            style={{ width: `${progress}%`, height: '100%', background: isMine ? '#fff' : '#00a884', borderRadius: 2, transition: 'width 0.1s linear' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: isMine ? (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)') : K.muted }}>
          <span>{durationStr}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioSource}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setHasPlaybackError(true);
          setIsPlaying(false);
        }}
        hidden
      />
    </div>
  );
}

export function ImageMedia({ at }) {
  const rawSrc = at.image_url || at.asset_url || '';
  if (!rawSrc) return null;

  const optimizedSrc = rawSrc.includes('res.cloudinary.com')
    ? buildOptimizedImageUrl(rawSrc)
    : rawSrc;
  const isLocalPreview = rawSrc.startsWith('blob:') || rawSrc.startsWith('data:');

  return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
      {isLocalPreview ? (
        <img
          src={rawSrc}
          alt="attachment"
          loading="lazy"
          decoding="async"
          style={{ maxWidth: '100%', maxHeight: 400, display: 'block', cursor: 'pointer', objectFit: 'cover' }}
          onClick={() => window.open(rawSrc, '_blank')}
        />
      ) : (
        <Image
          src={optimizedSrc}
          width={500}
          height={320}
          alt="attachment"
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 768px) 80vw, 500px"
          style={{ width: '100%', height: 'auto', maxHeight: 400, display: 'block', cursor: 'pointer', objectFit: 'cover' }}
          onClick={() => window.open(rawSrc, '_blank')}
        />
      )}
    </div>
  );
}

export function FileMessage({ at, isDark, themes: K }) {
  return (
    <a
      href={at.asset_url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px',
        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'inherit',
        border: `1px solid ${K.border}`
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: isDark ? '#2a3942' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <FileText size={24} color={isDark ? '#8696a0' : '#667781'} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: K.text }}>{at.name || 'Document'}</div>
        <div style={{ fontSize: 12, color: K.muted, textTransform: 'uppercase' }}>{at.file_size ? (at.file_size / 1024).toFixed(0) + ' KB' : ''} - {at.mime_type?.split('/')[1] || 'FILE'}</div>
      </div>
      <Download size={20} color={K.muted} />
    </a>
  );
}

export function VideoMessage({ at }) {
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxWidth: 250, background: '#000' }}>
      <video
        controls
        style={{ width: '100%', display: 'block', borderRadius: 12 }}
        preload="metadata"
      >
        <source src={at.asset_url || at.video_url} type={at.mime_type || 'video/mp4'} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
