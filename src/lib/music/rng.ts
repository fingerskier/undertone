export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function jitter(rng: Rng, amount: number): number {
  return (rng() * 2 - 1) * amount;
}

export function seedFromHex(value: string): number {
  const cleaned = value.replace(/[^0-9a-f]/gi, "");
  if (!cleaned) return 0x5e7a001;
  return Number.parseInt(cleaned.slice(0, 8), 16) >>> 0;
}

export function seedToHex(seed: number): string {
  return (seed >>> 0).toString(16).padStart(8, "0");
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
