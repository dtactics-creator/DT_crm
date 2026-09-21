import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function IframePreview({ children, title, className, style }: { children: React.ReactNode, title?: string, className?: string, style?: React.CSSProperties }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentRef, setContentRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    
    // Create a div in the iframe to mount the react tree
    const mountNode = doc.createElement('div');
    doc.body.appendChild(mountNode);
    setContentRef(mountNode);

    // Copy styles from parent
    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
    styles.forEach(style => {
      doc.head.appendChild(style.cloneNode(true));
    });

    // Reset some iframe body styles for consistency
    doc.body.style.margin = '0';
    doc.body.style.padding = '0';
    doc.body.style.backgroundColor = 'transparent';

    return () => {
      if (mountNode.parentNode) {
        mountNode.parentNode.removeChild(mountNode);
      }
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title={title || "Preview"}
      className={className}
      style={style}
    >
      {contentRef && createPortal(children, contentRef)}
    </iframe>
  );
}
