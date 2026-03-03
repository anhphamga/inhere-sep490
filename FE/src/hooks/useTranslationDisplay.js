import { useCallback, useEffect, useRef } from "react";
import { translateBatch } from "../services/translationApi";

export function useTranslationDisplay(lang = "vi", { debounceMs = 120 } = {}) {
  const queueRef = useRef(new Map());
  const timerRef = useRef(null);

  const flushQueue = useCallback(async () => {
    const entries = Array.from(queueRef.current.values());
    queueRef.current.clear();
    timerRef.current = null;
    if (entries.length === 0) return;

    const batchPayload = entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      source: entry.source,
      target: entry.target,
    }));

    try {
      const { translations } = await translateBatch(batchPayload);
      entries.forEach((entry) => {
        entry.resolve(translations[entry.id] || entry.text);
      });
    } catch {
      entries.forEach((entry) => entry.resolve(entry.text));
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(flushQueue, debounceMs);
  }, [debounceMs, flushQueue]);

  const translateDisplay = useCallback(
    (text, { source = "vi", target = "en", id } = {}) =>
      new Promise((resolve) => {
        const cleanedText = String(text || "").trim();
        if (!cleanedText || lang !== "en") {
          resolve(cleanedText);
          return;
        }

        const requestId = String(id || `${source}_${target}_${cleanedText}`);
        queueRef.current.set(requestId, {
          id: requestId,
          text: cleanedText,
          source,
          target,
          resolve,
        });
        scheduleFlush();
      }),
    [lang, scheduleFlush]
  );

  const translateFields = useCallback(
    async (fields = [], { source = "vi", target = "en" } = {}) => {
      const cleanFields = (Array.isArray(fields) ? fields : [])
        .map((field, index) => ({
          id: String(field?.id || `field_${index}`),
          text: String(field?.text || "").trim(),
          source,
          target,
        }))
        .filter((field) => field.text);

      if (lang !== "en") {
        return Object.fromEntries(cleanFields.map((field) => [field.id, field.text]));
      }

      const result = await translateBatch(cleanFields);
      return result.translations || {};
    },
    [lang]
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const pending = Array.from(queueRef.current.values());
      queueRef.current.clear();
      pending.forEach((entry) => entry.resolve(entry.text));
    },
    []
  );

  return {
    translateDisplay,
    translateFields,
  };
}
