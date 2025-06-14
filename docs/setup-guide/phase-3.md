# Phase III: Design System & Theme Configuration

## Dependencies for This Phase

```json
{
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@tanstack/react-query": "^5.80.7",
    "zustand": "^4.5.2",
    "tailwindcss": "^3.4.1"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.80.7",
    "typescript": "^5.x"
  }
}
```

---

## Overview

Phase III establishes the visual foundation of the ABCO AI application with a comprehensive design system. This phase creates the global styles, configures Tailwind CSS with custom theme values, and prepares static assets needed throughout the application.

---

## Step 3.1: Create Global Styles

Replace `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

@layer base {
  :root {
    /* ABCO Navy Theme */
    --bg-nav: #081827;
    --accent-blue: #3B82F6;
    --brand-blue: #3333cc;
    --txt-light: #e2e2e2;
    
    /* Electric Blue Owl Theme */
    --electric-blue: #149DEA;
    --electric-glow: #1EB8FF;
    --deep-navy: #0A1E33;
    --dark-bg: #020B18;
    --bg-primary: #020B18;
    --bg-secondary: #0A1E33;
    --surface-elevated: #11263F;
    --border-subtle: #1B4674;
    --accent-primary: #149DEA;
    --accent-hover: #1EB8FF;
    --accent-glow: #9FEBF8;
    --text-primary: #F0F6FC;
    --text-secondary: #A0B4CC;
    --user-bubble: #0C7BD1;
    
    /* Legacy Colors */
    --primary-color: #e67e22;
    --secondary-color: #34495e;
    --primary-light: #4545dd;
    --secondary-light: #99ddff;
    --accent-color: #3B82F6;
    --accent-light: #2222aa;
    --background-color: #e6f2ff;
    --background-light: #f0f8ff;
    --text-color: #212529;
    --text-light: #6c757d;
    --danger-color: #e74c3c;
    --success-color: #2ecc71;
    --warning-color: #f1c40f;
    --info-color: #66ccff;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--dark-bg);
    color: var(--text-primary);
    line-height: 1.6;
  }
}

@layer components {
  /* Brand Typography */
  .brand-name {
    @apply font-bold font-montserrat text-white text-lg leading-tight tracking-wide;
  }

  .brand-subtitle {
    @apply font-medium font-montserrat text-[#66ccff] text-xs leading-tight;
  }

  /* Navigation Links */
  .nav-link {
    @apply text-[#e2e2e2] hover:text-white transition-colors duration-200 px-4 py-2 rounded hover:bg-white/10;
  }

  /* Buttons */
  .btn-primary {
    @apply bg-gradient-to-r from-[#0C7BD1] to-[#1EB8FF] text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200;
  }

  .btn-secondary {
    @apply bg-[#11263F] text-white px-6 py-3 rounded-lg font-medium border border-[#149DEA]/30 hover:bg-[#1B4674] transition-all duration-200;
  }

  /* Forms */
  .form-label {
    @apply block text-white mb-2 font-medium;
  }

  .form-control {
    @apply w-full p-3 rounded-lg bg-[#11263F] border border-[#149DEA]/30 text-white placeholder-[#A0B4CC] focus:border-[#149DEA] focus:outline-none focus:ring-2 focus:ring-[#149DEA]/20 transition-all duration-200;
  }

  /* Cards */
  .glass-card {
    @apply bg-[#0A1E33]/70 border border-[#149DEA]/40 rounded-lg backdrop-blur-sm;
  }

  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulseEffect {
    0% { opacity: 0.05; }
    50% { opacity: 0.15; }
    100% { opacity: 0.08; }
  }

  .animate-fadeInUp {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-pulseEffect {
    animation: pulseEffect 8s infinite alternate;
  }
}

@layer utilities {
  /* Text Shadows */
  .text-glow {
    text-shadow: 0 0 15px rgba(20, 157, 234, 0.6);
  }

  /* Custom Scrollbar */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--border-subtle);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
  }
}
```

---

## Step 3.2: Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'abco-navy': '#081827',
        'electric-blue': '#149DEA',
        'electric-glow': '#1EB8FF',
        'deep-navy': '#0A1E33',
        'dark-bg': '#020B18',
        'surface-elevated': '#11263F',
        'border-subtle': '#1B4674',
        'text-primary': '#F0F6FC',
        'text-secondary': '#A0B4CC',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-effect': 'pulseEffect 8s infinite alternate',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Step 3.3: Add Static Assets

Create the following directory structure and add placeholder files:

```
public/
├── images/
│   ├── abco-logo.png
│   ├── abco-new-sleak.png
│   ├── abco-watercolor.png
│   ├── blue-ohmni-owl.png
│   ├── ohmni-blue-owl-lightning.png
│   ├── owl-lab.png
│   ├── owl-mini-blueprint.png
│   ├── owl-upload-final.png
│   └── perfect-thorr-chatbot.png
└── favicon.ico
```

**Note**: For now, create placeholder images or use temporary images. You'll replace these with the actual ABCO assets later.

---

## Key Design System Features

### Color Palette
- **Primary**: Electric Blue (#149DEA) - Main interactive elements
- **Secondary**: Deep Navy (#0A1E33) - Background surfaces
- **Accent**: Electric Glow (#1EB8FF) - Hover states and highlights
- **Dark Background**: #020B18 - Main app background
- **Surface Elevated**: #11263F - Card and component backgrounds

### Typography
- **Headers**: Montserrat (500-700 weight)
- **Body**: Poppins (400-700 weight)
- **UI Elements**: Inter (400-700 weight)

### Component Classes
- `.glass-card`: Glassmorphism effect for cards
- `.btn-primary`: Gradient primary buttons
- `.btn-secondary`: Outlined secondary buttons
- `.form-control`: Styled form inputs
- `.nav-link`: Navigation link styling

### Animations
- `fadeInUp`: Entrance animation for cards and content
- `pulseEffect`: Subtle pulsing for background effects

---

## Testing Checklist

- [ ] Global styles are properly imported in `app/layout.tsx`
- [ ] Tailwind utilities are working
- [ ] Custom color classes are available
- [ ] Google Fonts are loading
- [ ] CSS animations are smooth
- [ ] Custom scrollbar styling is visible
- [ ] Glass card effects render correctly
- [ ] Button hover states work

---

## Next Phase

After completing Phase III, you'll be ready to move on to Phase IV: Authentication System, which will implement the login and registration flows using these design tokens.