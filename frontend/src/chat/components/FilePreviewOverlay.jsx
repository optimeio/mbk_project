"use client";

import React from 'react';
import './FilePreviewOverlay.css';

const FilePreviewOverlay = ({ isOpen, onClose, fileUrl, fileType, fileName }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    if (fileType === 'image') {
      return <img src={fileUrl} alt={fileName} className="preview-image" />;
    }
    
    if (fileType === 'video') {
      return (
        <video controls autoPlay className="preview-video">
          <source src={fileUrl} />
          Your browser does not support the video tag.
        </video>
      );
    }
    
    if (fileType === 'pdf' || fileUrl?.toLowerCase().endsWith('.pdf')) {
      return (
        <iframe 
          src={`${fileUrl}#toolbar=0`} 
          title={fileName} 
          className="preview-pdf"
        />
      );
    }

    return (
      <div className="preview-generic">
        <div className="preview-icon">📎</div>
        <p>{fileName}</p>
        <a href={fileUrl} download={fileName} className="preview-download-btn">
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className="file-preview-overlay" onClick={onClose}>
      <div className="preview-header">
        <span className="preview-filename">{fileName}</span>
        <button className="preview-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="preview-body" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
};

export default FilePreviewOverlay;
