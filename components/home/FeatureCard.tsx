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