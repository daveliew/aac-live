'use client';

import { useEffect } from 'react';
import { ContextNotification as NotificationType } from '@/lib/tiles';

interface ContextNotificationProps {
    notification: NotificationType;
    onDismiss: () => void;
}

export default function ContextNotification({ notification, onDismiss }: ContextNotificationProps) {
    // Auto-dismiss after 3 seconds
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [notification, onDismiss]);

    const bgColor =
        notification.type === 'context_confirmed'
            ? 'bg-green-500/20 border-green-500/50 text-green-300'
            : notification.type === 'context_changed'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';

    const icon =
        notification.type === 'context_confirmed'
            ? '✓'
            : notification.type === 'context_changed'
                ? '📍'
                : '⏳';

    return (
        <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full border ${bgColor} backdrop-blur-xl animate-in slide-in-from-top duration-300 flex items-center gap-2`}
        >
            <span>{icon}</span>
            <p className="text-sm font-semibold">{notification.message}</p>
        </div>
    );
}
