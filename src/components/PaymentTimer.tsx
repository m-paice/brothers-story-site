import { useEffect, useState } from 'react';

interface Props {
  expiresAt: string;
  onExpired?: () => void;
}

export function PaymentTimer({ expiresAt, onExpired }: Props) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (remaining <= 0) {
      onExpired?.();
      return;
    }
    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onExpired?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 300; // últimos 5 minutos

  if (remaining <= 0) {
    return (
      <span className="payment-timer payment-timer--expired">
        Pedido expirado
      </span>
    );
  }

  return (
    <span className={`payment-timer${isUrgent ? ' payment-timer--urgent' : ''}`}>
      ⏱ Expira em {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
