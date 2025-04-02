import { ThemeProvider } from "./theme-provider";
import { TRPCReactProvider } from "@/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TRPCReactProvider>
        {children}
      </TRPCReactProvider>
    </ThemeProvider>
  );
}

