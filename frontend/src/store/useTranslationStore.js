/*
 * NEW FILE: useTranslationStore.js
 * Date: 2025
 * Purpose:
 *  - Zustand store for per-conversation translation preferences
 *  - Persists language choice per userId in localStorage (key: chatnova_translation_prefs)
 *  - In-memory cache: { [msgId_lang]: translatedText } — avoids re-fetching
 *  - Tracks which messages are currently being translated (for loading state)
 *  - translateMessages() batch-translates all messages in a conversation
 *  - getTranslated() is sync (reads from cache) — safe to call in render
 * Imports: translateText from ../lib/translator
 */

/**
 * useTranslationStore.js
 *
 * Manages per-conversation language preference.
 * Each chat partner gets their own language setting stored in localStorage.
 * Default = "default" = no translation (show original text).
 *
 * Also caches translated messages in memory so we don't re-translate on every render.
 */

import { create } from "zustand";
import { translateText } from "../lib/translator";

const STORAGE_KEY = "chatnova_translation_prefs";

function loadPrefs() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

function savePrefs(prefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export const useTranslationStore = create((set, get) => ({
    // { [userId]: "en" | "hi" | ... | "default" }
    langPrefs: loadPrefs(),

    // translation cache: { [msgId_lang]: translatedText }
    cache: {},

    // which message IDs are currently being translated
    translating: {},

    // Get language for a specific chat partner (default = "default")
    getLang: (userId) => get().langPrefs[userId] || "default",

    // Set language for a specific chat partner
    setLang: (userId, lang) => {
        const prefs = { ...get().langPrefs, [userId]: lang };
        savePrefs(prefs);
        set({ langPrefs: prefs });
    },

    // Reset to default for a specific chat partner
    resetLang: (userId) => {
        const prefs = { ...get().langPrefs };
        delete prefs[userId];
        savePrefs(prefs);
        set({ langPrefs: prefs });
    },

    // Translate a single message, uses cache to avoid re-fetching
    translateMessage: async (msgId, text, targetLang) => {
        if (!text || targetLang === "default") return text;

        const cacheKey = `${msgId}_${targetLang}`;
        const cached = get().cache[cacheKey];
        if (cached) return cached;

        // mark as translating
        set((s) => ({ translating: { ...s.translating, [cacheKey]: true } }));

        try {
            const translated = await translateText(text, targetLang);
            set((s) => ({
                cache: { ...s.cache, [cacheKey]: translated },
                translating: { ...s.translating, [cacheKey]: false },
            }));
            return translated;
        } catch {
            set((s) => ({ translating: { ...s.translating, [cacheKey]: false } }));
            return text;
        }
    },

    // Translate all messages in a list for a given language
    translateMessages: async (messages, targetLang) => {
        if (!targetLang || targetLang === "default") return;
        const { translateMessage } = get();
        await Promise.all(
            messages
                .filter((m) => m.text)
                .map((m) => translateMessage(m._id, m.text, targetLang))
        );
    },

    // Get translated text from cache (sync, for render)
    getTranslated: (msgId, originalText, targetLang) => {
        if (!targetLang || targetLang === "default") return originalText;
        const cacheKey = `${msgId}_${targetLang}`;
        return get().cache[cacheKey] || originalText;
    },

    isTranslating: (msgId, targetLang) => {
        const cacheKey = `${msgId}_${targetLang}`;
        return !!get().translating[cacheKey];
    },
}));
