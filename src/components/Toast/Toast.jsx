'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import styles from './Toast.module.css';

/**
 * Toast notification system.
 * Usage: <ToastContainer /> + useToast() hook
 */

// Global toast queue (outside React for cross-component access)
let toastListeners = [];
let toastIdCounter = 0;

export function showToast({ title, message, severity = 'info', duration = 4000 }) {
  const toast = {
    id: ++toastIdCounter,
    title,
    message,
    severity,
    duration,
    createdAt: Date.now(),
  };
  toastListeners.forEach((listener) => listener(toast));
}

const SEVERITY_ICONS = {
  warning: '⚠️',
  critical: '🚨',
  success: '✅',
  info: 'ℹ️',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [exiting, setExiting] = useState(new Set());
  const timersRef = useRef({});

  const dismissToast = useCallback((id) => {
    setExiting((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300); // match animation duration
  }, []);

  useEffect(() => {
    const listener = (toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]); // max 5

      // Auto-dismiss
      timersRef.current[toast.id] = setTimeout(() => {
        dismissToast(toast.id);
      }, toast.duration);
    };

    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toast_container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[`toast_${toast.severity}`] || styles.toast_info} ${
            exiting.has(toast.id) ? styles.toast_exiting : ''
          }`}
          onClick={() => dismissToast(toast.id)}
          role="alert"
        >
          <span className={styles.toast__icon}>
            {SEVERITY_ICONS[toast.severity] || 'ℹ️'}
          </span>
          <div className={styles.toast__body}>
            <div className={styles.toast__title}>{toast.title}</div>
            <div className={styles.toast__message}>{toast.message}</div>
          </div>
          <div className={styles.toast__timer} style={{ animationDuration: `${toast.duration}ms` }} />
        </div>
      ))}
    </div>
  );
}
