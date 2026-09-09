import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Fusionne des classes conditionnelles (clsx) puis dédoublonne les classes
 * Tailwind en conflit (tailwind-merge). Helper standard shadcn/ui — utilisé
 * par tous les composants de src/components/ui/.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
