"use client";

import { useEffect, useState } from 'react';
import Icon from '@/components/common/Icon';

function LegacyChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const chatWidget = document.querySelector('.chat-widget');
      if (chatWidget && !chatWidget.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="chat-widget">
      <div className={`chat-window ${isOpen ? 'active' : ''}`} id="chatWindow">
        <div className="chat-header">
          <h4>MBK Technology</h4>
          <p>Typical reply time: 5 mins</p>
        </div>
        <div className="chat-body">
          <div className="chat-msg">Chat with us - Admissions &amp; Institutional Partnerships</div>
        </div>
        <div className="chat-footer">
          <a href="https://wa.me/918807653965" target="_blank" rel="noopener noreferrer" className="wa-connect-btn">
            <Icon name="message-circle" style={{ width: '18px', height: '18px' }} /> Open WhatsApp Chat
          </a>
        </div>
      </div>
      <button
        className="chat-btn"
        id="chatBtn"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Icon name="message-square" style={{ width: '26px', height: '26px' }} />
      </button>
    </div>
  );
}

export default LegacyChatWidget;
