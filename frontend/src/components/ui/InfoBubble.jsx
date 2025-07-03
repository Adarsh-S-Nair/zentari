import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const InfoBubble = ({ children, text }) => {
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef(null);

  useEffect(() => {
    if (hovered && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const bubbleHeight = 40; // approximate
      const bubbleWidth = 180;

      let top = rect.top + window.scrollY - bubbleHeight - 8;
      let left = rect.left + window.scrollX + rect.width / 2 - bubbleWidth / 2;

      // prevent overflow
      const maxLeft = window.innerWidth - bubbleWidth - 8;
      if (left < 8) left = 8;
      if (left > maxLeft) left = maxLeft;

      setPosition({ top, left });
    }
  }, [hovered]);

  return (
    <div
      ref={anchorRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
    >
      {children}

      {hovered &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              zIndex: 1000,
              backgroundColor: '#fff',
              color: '#374151',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
              minWidth: '160px',
              maxWidth: '200px',
              textAlign: 'center',
              opacity: 1,
              pointerEvents: 'none',
            }}
          >
            {text}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                marginLeft: -4,
                width: 8,
                height: 8,
                backgroundColor: '#fff',
                borderLeft: '1px solid #e5e7eb',
                borderTop: '1px solid #e5e7eb',
                transform: 'rotate(45deg)',
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export default InfoBubble;
