"use client";

import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from 'react';
import en from './locales/en.json';
import { Globe, ChevronDown } from 'lucide-react';

/* ─── Simple i18n context (English content source) ─── */

interface I18nContextType {
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({ t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
    const t = useCallback((key: string): string => {
        return (en as Record<string, string>)[key] ?? key;
    }, []);

    return (
        <I18nContext.Provider value={{ t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}

/* ─── Google Translate (cookie-based) ─── */

const LANGUAGES = [
    { code: '', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'zh-CN', label: '中文(简)' },
    { code: 'zh-TW', label: '中文(繁)' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'ar', label: 'العربية' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'th', label: 'ไทย' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'tl', label: 'Filipino' },
    { code: 'ru', label: 'Русский' },
];

function setGoogleTranslateCookie(langCode: string) {
    // Set the googtrans cookie that Google Translate reads
    const value = langCode ? `/en/${langCode}` : '';
    document.cookie = `googtrans=${value}; path=/`;
    // Also set on the domain level
    document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}`;
}

function getGoogleTranslateCookie(): string {
    const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
    return match ? match[1] : '';
}

export function GoogleTranslate({ className = '', dark = true }: { className?: string; dark?: boolean }) {
    const [open, setOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState('');
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Read current language from cookie
    useEffect(() => {
        setCurrentLang(getGoogleTranslateCookie());
    }, []);

    // Load the Google Translate script (hidden, works via cookie)
    useEffect(() => {
        if (document.getElementById('google-translate-script')) {
            setScriptLoaded(true);
            return;
        }

        window.googleTranslateElementInit = () => {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: 'en',
                    autoDisplay: false,
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                },
                'wotf-google-translate-hidden'
            );
            setScriptLoaded(true);
        };

        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectLanguage = (langCode: string) => {
        setCurrentLang(langCode);
        setOpen(false);

        if (!langCode) {
            // Reset to English
            setGoogleTranslateCookie('');
            // Remove Google Translate frame
            const frame = document.querySelector('.goog-te-banner-frame') as HTMLElement;
            if (frame) frame.style.display = 'none';
            // Try to use Google Translate's restore function
            const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
            if (select) {
                select.value = 'en';
                select.dispatchEvent(new Event('change'));
            }
            // Fallback: reload
            window.location.reload();
            return;
        }

        // Trigger Google Translate via the hidden select element
        setGoogleTranslateCookie(langCode);

        const tryTrigger = () => {
            const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
            if (select) {
                select.value = langCode;
                select.dispatchEvent(new Event('change'));
            } else {
                // If widget not ready yet, reload to let cookie take effect
                window.location.reload();
            }
        };

        // Small delay to let the widget initialize
        setTimeout(tryTrigger, 300);
    };

    const currentDisplay = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

    return (
        <div ref={ref} className={`relative ${className}`}>
            {/* Hidden Google Translate widget (drives the actual translation) */}
            <div id="wotf-google-translate-hidden" className="hidden" />

            {/* Custom styled dropdown trigger */}
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors notranslate ${
                    dark
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-600 hover:text-black'
                }`}
                aria-label="Switch language"
            >
                <Globe size={15} />
                <span className="text-xs font-bold uppercase tracking-wider">{currentDisplay.label}</span>
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px] max-h-[320px] overflow-y-auto notranslate">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => selectLanguage(lang.code)}
                            className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                lang.code === currentLang
                                    ? 'text-white bg-white/10 font-semibold'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

declare global {
    interface Window {
        google: any;
        googleTranslateElementInit: () => void;
    }
}
