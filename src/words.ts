export function getWords(): string[] {
  const list = process.env.WORD_LIST;
  if (!list) {
    console.warn('[EvilEvent] WORD_LIST env var not set — evil event will not run');
    return [];
  }
  return list.split(',').map(w => w.trim().toUpperCase()).filter(w => /^[A-Z]{5}$/.test(w));
}
