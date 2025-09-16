// == IMPORTS & DEPENDENCIES ==
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// == UTILITY FUNCTIONS ==
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}