import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
type Style = "default" | "ledger" | "neon-mint" | "parchment" | "glass" | "mono"

export const STYLE_OPTIONS: { value: Style; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Clean & neutral" },
  { value: "ledger", label: "Ledger", description: "Classic financial" },
  { value: "neon-mint", label: "Neon Mint", description: "Modern fintech" },
  { value: "parchment", label: "Parchment", description: "Warm analog" },
  { value: "glass", label: "Glass", description: "Translucent depth" },
  { value: "mono", label: "Mono", description: "Terminal / hacker" },
]

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultStyle?: Style
  storageKey?: string
  styleStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  style: Style
  setStyle: (style: Style) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  style: "default",
  setStyle: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultStyle = "default",
  storageKey = "vite-ui-theme",
  styleStorageKey = "vite-ui-style",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [style, setStyleState] = useState<Style>(
    () => (localStorage.getItem(styleStorageKey) as Style) || defaultStyle
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute("data-style", style)
  }, [style])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
  }

  const setStyle = (newStyle: Style) => {
    localStorage.setItem(styleStorageKey, newStyle)
    setStyleState(newStyle)
  }

  const value = {
    theme,
    setTheme,
    style,
    setStyle,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
