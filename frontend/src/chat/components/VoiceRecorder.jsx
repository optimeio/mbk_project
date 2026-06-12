"use client";

import React, { useState, useRef } from 'react';
import { useChannelActionContext, useChatContext } from 'stream-chat-react';
import './VoiceRecorder.css';

const VoiceRecorder = ({ channel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const { client } = useChatContext();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const file = new File([audioBlob], 'voice-message.wav', { type: 'audio/wav' });
        
        try {
          const response = await channel.sendFile(file);
          await channel.sendMessage({
            attachments: [
              {
                type: 'audio',
                asset_url: response.file,
                title: 'Voice Message',
              },
            ],
          });
        } catch (err) {
          console.error('Error sending voice message:', err);
        }
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
      recorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className={`wa-voice-recorder ${isRecording ? 'recording' : ''}`}>
      {isRecording ? (
        <div className="wa-recorder-active">
          <div className="wa-recording-dot"></div>
          <span className="wa-recording-timer">Recording...</span>
          <button className="wa-stop-btn" onClick={stopRecording}>Done</button>
        </div>
      ) : (
        <button className="wa-mic-btn" onClick={startRecording}>
          🎤
        </button>
      )}
    </div>
  );
};

export default VoiceRecorder;
