'use client';

import { useSession, signOut } from 'next-auth/react';
import { FeatureCard } from '@/components/home/FeatureCard';

export default function HomePage() {
  const { data: session, status } = useSession();
  const firstName = session?.user?.name?.split(' ')[0];

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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
        {/* Logout Button - Top Right */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          Sign Out
        </button>

        {/* Welcome Heading */}
        <h1 className="text-4xl text-white mb-3 font-bold text-center text-glow">
          Welcome{firstName && `, ${firstName}`}!
        </h1>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <FeatureCard
            icon="/images/perfect-thorr-chatbot.png"
            title="Ohmni Oracle"
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
          {`"Built by electricians. Powered by AI."`}
        </p>
      </div>
    </section>
  );
} 