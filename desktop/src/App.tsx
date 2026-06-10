import LayoutShell from "./components/LayoutShell";
import { ThemeProvider } from "./hooks/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <LayoutShell />
    </ThemeProvider>
  );
}
