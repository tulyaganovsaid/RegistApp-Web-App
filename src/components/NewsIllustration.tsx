import React, { useState } from 'react';
import { Compass, Train, Landmark, Mountain, Shield, Utensils, Calendar, Camera, Sparkles } from 'lucide-react';

interface NewsIllustrationProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
  aspectRatioClass?: string;
  priority?: boolean;
}

// Curated high-reliability alternate travel imagery for Uzbekistan
const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  transport: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?q=80&w=1200&auto=format&fit=crop',
  nature: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
  culture: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1200&auto=format&fit=crop',
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop',
  law: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop'
};

export function NewsIllustration({
  src,
  alt,
  className = 'w-full h-full object-cover',
  category = '',
  priority = false
}: NewsIllustrationProps) {
  const [loadError, setLoadError] = useState(false);
  const [usedFallbackUrl, setUsedFallbackUrl] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Pick category icon
  const getCategoryIcon = () => {
    const c = category.toLowerCase();
    if (c.includes('транспорт') || c.includes('transport') || c.includes('поезд') || c.includes('train')) {
      return <Train className="h-8 w-8 text-[#90B24A]" />;
    }
    if (c.includes('гор') || c.includes('mountain') || c.includes('природ') || c.includes('nature') || c.includes('эко')) {
      return <Mountain className="h-8 w-8 text-[#90B24A]" />;
    }
    if (c.includes('гастроном') || c.includes('food') || c.includes('плов') || c.includes('restau')) {
      return <Utensils className="h-8 w-8 text-[#90B24A]" />;
    }
    if (c.includes('безопасн') || c.includes('закон') || c.includes('инфограф') || c.includes('виз') || c.includes('safety') || c.includes('law')) {
      return <Shield className="h-8 w-8 text-[#90B24A]" />;
    }
    if (c.includes('культура') || c.includes('история') || c.includes('самарканд') || c.includes('хива') || c.includes('culture')) {
      return <Landmark className="h-8 w-8 text-[#90B24A]" />;
    }
    return <Compass className="h-8 w-8 text-[#90B24A]" />;
  };

  const getFallbackCategoryUrl = () => {
    const c = category.toLowerCase();
    if (c.includes('транспорт') || c.includes('transport')) return FALLBACK_CATEGORY_IMAGES.transport;
    if (c.includes('гор') || c.includes('mountain') || c.includes('эко')) return FALLBACK_CATEGORY_IMAGES.nature;
    if (c.includes('гастроном') || c.includes('food')) return FALLBACK_CATEGORY_IMAGES.food;
    if (c.includes('закон') || c.includes('инфограф')) return FALLBACK_CATEGORY_IMAGES.law;
    return FALLBACK_CATEGORY_IMAGES.default;
  };

  const handleError = () => {
    if (!usedFallbackUrl && src) {
      // First try secondary fallback URL
      setUsedFallbackUrl(true);
    } else {
      // If secondary fails too, render thematic vector illustration
      setLoadError(true);
    }
  };

  const currentSrc = usedFallbackUrl ? getFallbackCategoryUrl() : (src || getFallbackCategoryUrl());

  if (loadError || !currentSrc) {
    return (
      <div className="w-full h-full min-h-[160px] relative overflow-hidden bg-gradient-to-br from-[#121814] via-[#1A241C] to-[#0D1410] border border-[#2B3232] flex flex-col items-center justify-center p-6 text-center select-none">
        {/* Subtle decorative geometric backdrop */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#90B24A_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 flex flex-col items-center space-y-2">
          <div className="p-3 rounded-2xl bg-[#0F1410] border border-[#7A9A3C]/40 shadow-inner">
            {getCategoryIcon()}
          </div>
          <div className="text-xs font-bold text-white tracking-wide max-w-[80%] line-clamp-2">
            {alt}
          </div>
          {category && (
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#7A9A3C]/20 text-[#90B24A] border border-[#7A9A3C]/30">
              {category}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#111414]">
      {/* Loading shimmer if not yet loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#161B1B] animate-pulse flex items-center justify-center">
          <Camera className="h-6 w-6 text-[#2B3232] animate-pulse" />
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default NewsIllustration;
