import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
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
				'handlee': ['var(--font-handlee)', 'cursive'],
				'rubik': ['var(--font-rubik)', 'sans-serif'],
				'sans': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
				'mono': ['var(--font-jetbrains)', 'monospace'],
			},
			fontSize: {
				// Semantic type scale with fluid clamp
				h1: ['clamp(2.25rem, 1.5rem + 2.5vw, 3rem)', { lineHeight: '1.25' }],
				h2: ['clamp(1.875rem, 1.25rem + 1.5vw, 2.25rem)', { lineHeight: '1.3' }],
				h3: ['clamp(1.5rem, 1.1rem + 1.2vw, 1.875rem)', { lineHeight: '1.35' }],
				h4: ['clamp(1.25rem, 1rem + 0.8vw, 1.5rem)', { lineHeight: '1.4' }],
				body: ['clamp(1rem, 0.95rem + 0.2vw, 1rem)', { lineHeight: '1.5' }],
				sm: ['clamp(0.875rem, 0.84rem + 0.2vw, 0.875rem)', { lineHeight: '1.45' }],
				xs: ['clamp(0.75rem, 0.72rem + 0.2vw, 0.75rem)', { lineHeight: '1.4' }],
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