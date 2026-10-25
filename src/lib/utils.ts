import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatMm(mm: number, digits = 1): string {
  return `${trimNum(mm, digits)} mm`;
}

export function formatDim(mm: number, unit: "mm" | "in", digits?: number): string {
  if (unit === "in") {
    return `${trimNum(mm / 25.4, digits ?? 3)} in`;
  }
  return `${trimNum(mm, digits ?? 1)} mm`;
}

export function trimNum(value: number, digits: number): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
