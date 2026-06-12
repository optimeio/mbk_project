"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Send } from 'lucide-react';

const ModernVoiceRecorder = ({ onStop, onCancel, isDark }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const actionRef = useRef('cancel'); // 'cancel' or 'send'

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Use functional state update to get latest time, or just a ref/dependency.
        // We'll trust the dependency array captures the latest recordingTime if we stop cleanly.
        // But since onstop runs later, let's use a function reference if needed. 
        // Actually, since startRecording is wrapped in useCallback with recordingTime, 
        // it may have a stale closure. It's safer to pass time to onstop somehow.
        // Let's use a ref for the final time.
      };

      recorder.start();
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
      onCancel();
    }
  }, [onCancel]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      actionRef.current = 'cancel';
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    startRecording();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    actionRef.current = 'cancel';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  const handleSend = () => {
    if (recordingTime < 1) {
      handleCancel();
      return;
    }
    actionRef.current = 'send';
    setIsProcessing(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Create a final blob immediately instead of relying on unpredictable onstop closure
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        onStop(blob, recordingTime);
      };
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flex: 1, 
        padding: '0 8px',
        height: '36px'
      }}
    >
      <button 
        onClick={handleCancel} 
        disabled={isProcessing}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: '#ea0038', 
          cursor: isProcessing ? 'default' : 'pointer', 
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isProcessing ? 0.5 : 1
        }}
      >
        <Trash2 size={20} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="recording-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ea0038' }} />
        <span style={{ fontSize: '15px', color: isDark ? '#e9edef' : '#111b21', fontFamily: 'monospace', fontWeight: 500 }}>
          {formatTime(recordingTime)}
        </span>
      </div>

      <button 
        onClick={handleSend} 
        disabled={isProcessing}
        style={{ 
          background: '#00a884', 
          border: 'none', 
          color: '#fff', 
          borderRadius: '50%', 
          width: '36px', 
          height: '36px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          cursor: isProcessing ? 'default' : 'pointer',
          opacity: isProcessing ? 0.5 : 1,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        <Send size={18} style={{ marginLeft: '2px' }} />
      </button>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.1); } }
        .recording-dot { animation: blink 1s ease-in-out infinite; }
      `}</style>
    </motion.div>
  );
};

export default ModernVoiceRecorder;
