import { Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme, STYLE_OPTIONS } from "@/providers/theme-provider"

export function StyleToggle() {
  const { style, setStyle } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" title="Change UI style">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change style</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {STYLE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setStyle(option.value)}
            className="flex items-center justify-between"
          >
            <div>
              <span className="font-medium">{option.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{option.description}</span>
            </div>
            {style === option.value && (
              <span className="text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
