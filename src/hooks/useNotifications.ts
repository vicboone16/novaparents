/**
 * useNotifications — Push notification reminders for coaches.
 * Uses the browser Notification API + a daily schedule check.
 */

import { useEffect, useCallback, useRef } from 'react';

const LAST_REMINDER_KEY = 'bd_last_reminder';
const REMINDER_HOUR = 18; // 6 PM default

export function useNotifications(enabled: boolean) {
  const scheduledRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const sendReminder = useCallback((title: string, body: string) => {
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'bd-daily-reminder',
      });
    } catch {
      // Safari/iOS may not support Notification constructor
    }
  }, []);

  const checkAndSendDaily = useCallback(() => {
    if (!enabled) return;
    
    const now = new Date();
    const lastSent = localStorage.getItem(LAST_REMINDER_KEY);
    const today = now.toISOString().split('T')[0];

    if (lastSent === today) return; // Already sent today
    if (now.getHours() < REMINDER_HOUR) return; // Not time yet

    sendReminder(
      '📊 Time to log!',
      "Don't forget to log today's behaviors and continue your training lessons."
    );
    localStorage.setItem(LAST_REMINDER_KEY, today);
  }, [enabled, sendReminder]);

  useEffect(() => {
    if (!enabled || scheduledRef.current) return;
    scheduledRef.current = true;

    // Request permission on first enable
    requestPermission();

    // Check immediately
    checkAndSendDaily();

    // Check every 15 minutes
    const interval = setInterval(checkAndSendDaily, 15 * 60 * 1000);
    return () => {
      clearInterval(interval);
      scheduledRef.current = false;
    };
  }, [enabled, requestPermission, checkAndSendDaily]);

  return { requestPermission };
}
