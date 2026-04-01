import { createContext, useContext, createSignal, onMount } from 'solid-js';

const ThemeContext = createContext();

export function ThemeProvider(props) {
  const [isDark, setIsDark] = createSignal(true); // Por defecto oscuro

  onMount(() => {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      // Respetar preferencia del sistema
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    applyTheme(isDark());
  });

  const applyTheme = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newValue = !isDark();
    setIsDark(newValue);
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
    applyTheme(newValue);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}