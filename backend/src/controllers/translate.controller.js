/**
 * translate.controller.js
 * Proxy endpoint: POST /api/translate
 * Body: { text: string, targetLang: string, sourceLang?: string }
 *
 * Why a backend proxy?
 *  - MyMemory works perfectly server-side with explicit source lang
 *  - Avoids browser CORS issues and client-side rate limits
 *  - Keeps API logic off the client bundle
 */

export const translateMessage = async (req, res) => {
    const { text, targetLang, sourceLang = "en" } = req.body;

    if (!text || !targetLang) {
        return res.status(400).json({ message: "text and targetLang are required" });
    }

    if (targetLang === "default") {
        return res.json({ translatedText: text });
    }

    // Try MyMemory first
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "ChatNova/1.0",
                "Accept": "application/json",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                const translated = data.responseData.translatedText;
                // MyMemory sometimes returns the original text when source detection fails
                // If that happens, try again with auto detection
                if (translated.trim().toLowerCase() !== text.trim().toLowerCase()) {
                    return res.json({ translatedText: translated });
                }
                // retry with auto (en detection fallback)
                if (sourceLang !== "auto") {
                    const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
                    const r2 = await fetch(url2, { signal: AbortSignal.timeout(5000) });
                    if (r2.ok) {
                        const d2 = await r2.json();
                        if (d2.responseStatus === 200 && d2.responseData?.translatedText) {
                            return res.json({ translatedText: d2.responseData.translatedText });
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn("[translate] MyMemory error:", err.message);
    }

    // Fallback: return original text
    return res.json({ translatedText: text, fallback: true });
};
