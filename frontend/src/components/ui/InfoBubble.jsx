import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const InfoBubble = ({ children, visible, position = 'top', style = {}, center = false, anchorRef }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const bubbleRef = useRef(null);

  useEffect(() => {
    if (visible && anchorRef && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [visible, anchorRef]);

  if (!visible) return null;

  // Calculate bubble position
  let bubbleStyle = { position: 'absolute', zIndex: 9999 };
  let arrowStyle = {};
  if (position === 'top') {
    bubbleStyle = {
      ...bubbleStyle,
      top: coords.top - 44, // 36px button + 8px gap
      left: coords.left + coords.width / 2,
      transform: 'translateX(-50%)',
    };
    arrowStyle = {
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid #fff',
    };
  }
  // Add more positions if needed

  return createPortal(
    <div
      ref={bubbleRef}
      style={{
        minWidth: 90,
        maxWidth: 220,
        padding: '8px 14px',
        background: '#fff',
        color: '#222',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 8px 32px 0 rgba(59,130,246,0.18), 0 2px 8px 0 rgba(31,41,55,0.10)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.18s, transform 0.18s',
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        textAlign: center ? 'center' : 'left',
        ...bubbleStyle,
        ...style,
      }}
    >
      {children}
      <div style={arrowStyle} />
    </div>,
    document.body
  );
};

export default InfoBubble;
