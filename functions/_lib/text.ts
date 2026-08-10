export function repairPublicText(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/[ÃÂ]/.test(text) || [...text].some((character) => character.charCodeAt(0) > 255)) return text;
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from([...text].map((character) => character.charCodeAt(0))));
    return decoded.includes("�") ? text : decoded;
  } catch { return text; }
}
