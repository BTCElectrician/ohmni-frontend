# Phase 5: Home Page Implementation

## Overview
This phase creates the home page with feature cards that showcase the main functionalities of ABCO AI.

---

## Step 5.1: Create Feature Card Component

Create `components/home/FeatureCard.tsx`:

```typescript
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  delay?: string;
  isUpload?: boolean;
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
  buttonText,
  delay = '0s',
  isUpload = false,
}: FeatureCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isUpload) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isUpload) {
      const files = Array.from(e.dataTransfer.files);
      // TODO: Handle file upload
      console.log('Files dropped:', files);
    }
  };

  const content = (
    <div
      className={`feature-card glass-card p-6 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
        isDragging ? 'border-electric-blue scale-105' : ''
      }`}
      style={{ animationDelay: delay }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="icon-wrapper mb-4 flex justify-center">
        <Image
          src={icon}
          alt={title}
          width={80}
          height={80}
          className="opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-text-secondary mb-4">{description}</p>
      
      <button className="btn-primary text-sm px-4 py-2">
        {buttonText}
      </button>
    </div>
  );

  if (isUpload) {
    return <div className="animate-fadeInUp">{content}</div>;
  }

  return (
    <Link href={href} className="block animate-fadeInUp">
      {content}
    </Link>
  );
}
```

---

## Step 5.2: Create Home Page

Create `app/page.tsx`:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { FeatureCard } from '@/components/home/FeatureCard';

export default function HomePage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0];

  return (
    <section 
      className="hero relative flex-grow w-full min-h-[calc(100vh-110px)] bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
      style={{ backgroundImage: "url('/images/abco-watercolor.png')" }}
    >
      {/* Electric overlay with blue tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#071629]/60 to-deep-navy/50 z-10" />
      
      {/* Animated electric lines effect */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-20 animate-pulseEffect"
        style={{
          backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
          backgroundSize: 'cover',
        }}
      />

      {/* Welcome Card */}
      <div className="relative z-30 w-[90%] max-w-[800px] p-10 glass-card">
        {/* Welcome Heading */}
        <h1 className="text-4xl text-white mb-3 font-bold text-center text-glow">
          Welcome{firstName && `, ${firstName}`}!
        </h1>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <FeatureCard
            icon="/images/perfect-thorr-chatbot.png"
            title="Chatbot"
            description="Ask NEC questions in seconds."
            href="/chat"
            buttonText="Open Chatbot"
            delay="0.1s"
          />
          
          <FeatureCard
            icon="/images/owl-mini-blueprint.png"
            title="Construction Management"
            description="Track projects and resources."
            href="/construction"
            buttonText="Open Tool"
            delay="0.2s"
          />
          
          <FeatureCard
            icon="/images/owl-upload-final.png"
            title="Upload Drawing"
            description="Analyze plans and specs."
            href="#"
            buttonText="Upload Now"
            delay="0.3s"
            isUpload={true}
          />
          
          <FeatureCard
            icon="/images/owl-lab.png"
            title="Prefab Lab"
            description="Calculate assembly times."
            href="#"
            buttonText="Start Prefab"
            delay="0.4s"
          />
        </div>
        
        {/* Footer Tagline */}
        <p className="footer-tagline mt-12 mb-0 text-center text-text-secondary italic text-base pt-5 border-t border-electric-glow/20">
          "Built by electricians. Powered by AI."
        </p>
      </div>
    </section>
  );
}
```

---

## Step 5.3: Add Required Images

Create placeholder images in `public/images/`:
- `abco-watercolor.png` - Background watercolor image
- `ohmni-blue-owl-lightning.png` - Electric lines overlay
- `perfect-thorr-chatbot.png` - Chatbot feature icon
- `owl-mini-blueprint.png` - Construction management icon
- `owl-upload-final.png` - Upload feature icon
- `owl-lab.png` - Prefab lab icon

**Note:** For development, you can use placeholder images or download temporary icons. Replace with actual ABCO assets when available.

---

## File Structure After Phase 5

```
abco-ai-frontend/
├── app/
│   ├── page.tsx (Home page)
│   └── ...existing files
├── components/
│   ├── home/
│   │   └── FeatureCard.tsx
│   └── ...existing folders
├── public/
│   └── images/
│       ├── abco-watercolor.png
│       ├── ohmni-blue-owl-lightning.png
│       ├── perfect-thorr-chatbot.png
│       ├── owl-mini-blueprint.png
│       ├── owl-upload-final.png
│       └── owl-lab.png
└── ...existing files
```

---

## Verification Checklist

After completing Phase 5, you should have:
- [ ] Home page with personalized welcome message
- [ ] Four feature cards with animations
- [ ] Drag-and-drop support on Upload Drawing card
- [ ] Background image with electric overlay effect
- [ ] Smooth hover animations on cards
- [ ] Responsive grid layout (1 column mobile, 2 columns desktop)
- [ ] Footer tagline with company slogan

---

## Dependencies Used in This Phase
- **React:** ^19.1.0 (useState)
- **Next.js:** ^15.3.3 (Image, Link components)
- **next-auth:** ^4.24.7 (useSession hook)
- **TypeScript:** ^5.x

---

## Key Features Implemented
- Personalized welcome with user's first name
- Animated feature cards with staggered delays
- Drag-and-drop zone for file uploads
- Glass morphism design with electric theme
- Responsive grid layout
- Smooth hover and animation effects

---

## Animation Details
- **fadeInUp:** Cards animate up on page load
- **pulseEffect:** Electric overlay pulses subtly
- **Hover:** Cards lift up with shadow on hover
- **Drag:** Upload card scales up when dragging files

---

## Next Phase
Once Phase 5 is complete, proceed to Phase 6: Chat Interface or Phase 3: Design System & Theme Configuration (if not already completed)