import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;

const InfoBubble = ({
  children,
  visible,
  position = 'bottom',
  anchorRef,
  style = {},
  center = false,
}) => {
  const bubbleRef = useRef(null);
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0, arrowLeft: '50%' });
  const [ready, setReady] = useState(false);

  // Measure and position bubble after mount
  useLayoutEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    if (!anchorRef?.current || !bubbleRef.current) return;
    // Render offscreen to measure
    setBubblePos({ top: 0, left: 0, arrowLeft: '50%' });
    setReady(false);
    // Next tick, measure and position
    requestAnimationFrame(() => {
      if (!anchorRef?.current || !bubbleRef?.current) {
        console.warn('InfoBubble: anchor or bubble ref not available');
        return;
      }
      
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      let top = 0, left = 0, arrowLeft = '50%';
      if (position === 'top') {
        top = window.scrollY + anchorRect.top - bubbleRect.height - GAP;
        left = window.scrollX + anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2;
        arrowLeft = `${bubbleRect.width / 2}px`;
      } else {
        // bottom
        top = window.scrollY + anchorRect.bottom + GAP;
        left = window.scrollX + anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2;
        arrowLeft = `${bubbleRect.width / 2}px`;
      }
      setBubblePos({ top, left, arrowLeft });
      setReady(true);
    });
  }, [visible, anchorRef, position, children]);

  // Reposition on scroll/resize
  useLayoutEffect(() => {
    if (!visible || !ready) return;
    const updatePosition = () => {
      if (!anchorRef?.current || !bubbleRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      let top = 0, left = 0, arrowLeft = '50%';
      if (position === 'top') {
        top = window.scrollY + anchorRect.top - bubbleRect.height - GAP;
        left = window.scrollX + anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2;
        arrowLeft = `${bubbleRect.width / 2}px`;
      } else {
        top = window.scrollY + anchorRect.bottom + GAP;
        left = window.scrollX + anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2;
        arrowLeft = `${bubbleRect.width / 2}px`;
      }
      setBubblePos({ top, left, arrowLeft });
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [visible, ready, anchorRef, position]);

  if (!visible) return null;

  // Arrow styles
  const arrowStyle = position === 'top'
    ? {
        position: 'absolute',
        top: '100%',
        left: bubblePos.arrowLeft,
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid #fff', // match bubble background
      }
    : {
        position: 'absolute',
        bottom: '100%',
        left: bubblePos.arrowLeft,
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: '8px solid #fff', // match bubble background
      };

  return createPortal(
    <div
      ref={bubbleRef}
      style={{
        minWidth: 70,
        maxWidth: 200,
        padding: '6px 12px',
        background: '#fff',
        color: '#555',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 400,
        boxShadow: '0 8px 32px 0 rgba(59,130,246,0.13), 0 2px 8px 0 rgba(31,41,55,0.10)',
        opacity: visible && ready ? 1 : 0,
        pointerEvents: visible && ready ? 'auto' : 'none',
        transition: 'opacity 0.18s, transform 0.18s',
        transform: visible && ready ? 'scale(1)' : 'scale(0.95)',
        textAlign: center ? 'center' : 'left',
        position: 'absolute',
        zIndex: 9999,
        top: ready ? bubblePos.top : 0,
        left: ready ? bubblePos.left : 0,
        visibility: ready ? 'visible' : 'hidden',
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