import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  	theme: {
		extend: {
			fontFamily: {
				'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
				'jetbrains': ['var(--font-jetbrains)', 'monospace'],
				'sans': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
				'mono': ['var(--font-jetbrains)', 'monospace'],
			},
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: "hsl(var(--primary))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
    },
  },
  plugins: [],
}
export default config 