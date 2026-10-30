import React, { useEffect, useRef } from 'react';

type TurnstileRenderOptions = {
    sitekey: string;
    theme: 'auto' | 'light' | 'dark';
    callback: (token: string) => void;
    'error-callback': () => void;
    'expired-callback': () => void;
    'timeout-callback': () => void;
};

type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    remove: (widgetId: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

let scriptPromise: Promise<void> | undefined;

const loadTurnstileScript = () => {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        script.onload = () => resolve();
        script.onerror = () => {
            scriptPromise = undefined;
            reject(new Error('Unable to load bot verification.'));
        };
        document.head.appendChild(script);
    });

    return scriptPromise;
};

interface TurnstileWidgetProps {
    siteKey: string;
    onTokenChange: (token: string) => void;
    onError: (message: string) => void;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ siteKey, onTokenChange, onError }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let disposed = false;
        let widgetId: string | undefined;

        void loadTurnstileScript()
            .then(() => {
                if (disposed || !containerRef.current || !window.turnstile) return;

                widgetId = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    theme: 'auto',
                    callback: (token) => onTokenChange(token),
                    'error-callback': () => {
                        onTokenChange('');
                        onError('Bot verification could not be completed. Please try again.');
                    },
                    'expired-callback': () => onTokenChange(''),
                    'timeout-callback': () => onTokenChange(''),
                });
            })
            .catch(() => {
                if (!disposed) onError('Bot verification could not be loaded. Please try again later.');
            });

        return () => {
            disposed = true;
            onTokenChange('');
            if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
        };
    }, [siteKey, onTokenChange, onError]);

    return <div ref={containerRef} className="contact-turnstile" aria-label="Bot verification" />;
};

export default TurnstileWidget;
