import * as React from "react"

// Breakpoint for "compact UI" features that use the `md:` Tailwind prefix.
const MOBILE_BREAKPOINT = 768

// Breakpoint that mirrors the layout switch between MobileSidebar (hamburger)
// and the fixed AppSidebar — this is the `lg:` Tailwind prefix (1024px).
// The product tour must use THIS breakpoint, not MOBILE_BREAKPOINT, otherwise
// the desktop tour tries to highlight a sidebar that is currently hidden.
const SIDEBAR_BREAKPOINT = 1024

function useMatchesMaxWidth(breakpoint: number): boolean {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setMatches(window.innerWidth < breakpoint)
    mql.addEventListener("change", onChange)
    setMatches(window.innerWidth < breakpoint)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return !!matches
}

export function useIsMobile() {
  return useMatchesMaxWidth(MOBILE_BREAKPOINT)
}

/**
 * True when the viewport is below the sidebar breakpoint, i.e. when the
 * hamburger MobileSidebar is showing and the fixed AppSidebar is hidden.
 * Single source of truth for "tour should run in mobile mode".
 */
export function useIsBelowLg() {
  return useMatchesMaxWidth(SIDEBAR_BREAKPOINT)
}

export function isBelowLgNow(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < SIDEBAR_BREAKPOINT
}
