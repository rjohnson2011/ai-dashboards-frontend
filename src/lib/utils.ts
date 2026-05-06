import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// GHE returns 30+ char hex strings as the login for deactivated/deleted users.
const GHOST_USER_RE = /^[a-f0-9]{20,}$/

export function isGhostUser(handle: string | undefined | null): boolean {
  return !!handle && GHOST_USER_RE.test(handle)
}

export function displayUser(handle: string | undefined | null): string {
  if (!handle) return ""
  return isGhostUser(handle) ? "(former user)" : handle
}