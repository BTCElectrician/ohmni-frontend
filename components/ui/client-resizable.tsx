'use client';

import dynamic from 'next/dynamic';

// SSR-safe dynamic imports
export const ResizablePanelGroup = dynamic(
  () => import('@/components/ui/resizable').then(mod => mod.ResizablePanelGroup),
  { 
    ssr: false,
    loading: () => <div className="flex h-full w-full" />
  }
);

export const ResizablePanel = dynamic(
  () => import('@/components/ui/resizable').then(mod => mod.ResizablePanel),
  { ssr: false }
);

export const ResizableHandle = dynamic(
  () => import('@/components/ui/resizable').then(mod => mod.ResizableHandle),
  { ssr: false }
); 