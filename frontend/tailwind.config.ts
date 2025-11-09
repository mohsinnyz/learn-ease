// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: [
    // Corrected paths to include the 'src' directory
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}', // Keep this if you use both routers
  ],
  theme: {
    extend: {},
  },
  plugins: [typography],
}

export default config