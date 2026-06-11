export const SYNONYM_MAP: Record<string, string[]> = {
  earbuds: ["earphones", "wireless earbuds", "bluetooth earbuds"],
  earphones: ["earbuds", "wireless earbuds"],
  serum: ["face serum", "skincare serum"],
  "led strip": ["led lights", "strip lights", "led strip lights"],
  "yoga mat": ["yoga mats", "exercise mat"],
  mascara: ["lash mascara", "eye mascara"],
  charger: ["phone charger", "usb charger"],
  blender: ["portable blender", "mini blender"],
};

export function nounPhrasesFromQuery(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words.slice(i, i + 2).join(" "));
    if (i < words.length - 2) {
      phrases.push(words.slice(i, i + 3).join(" "));
    }
  }
  return phrases.sort((a, b) => b.length - a.length);
}

export function queryVariants(query: string): string[] {
  const base = query.toLowerCase().trim();
  const variants = new Set<string>([base]);
  const phrases = nounPhrasesFromQuery(base);
  for (const phrase of phrases) {
    variants.add(phrase);
    for (const syn of SYNONYM_MAP[phrase] ?? []) variants.add(syn);
    if (phrase.endsWith("s")) variants.add(phrase.slice(0, -1));
    else variants.add(`${phrase}s`);
  }
  return Array.from(variants);
}
