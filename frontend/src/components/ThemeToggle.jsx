import { useTheme } from '../context/ThemeContext';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      class="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none border border-gray-300 dark:border-gray-600"
      style={{
        'background-color': isDark() ? '#374151' : '#e5e7eb'
      }}
      title={isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {/* Track */}
      <span
        class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300 flex items-center justify-center text-xs"
        style={{
          transform: isDark() ? 'translateX(24px)' : 'translateX(0px)',
          'background-color': isDark() ? '#111827' : '#ffffff',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.3)'
        }}
      >
        {isDark() ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

export default ThemeToggle;