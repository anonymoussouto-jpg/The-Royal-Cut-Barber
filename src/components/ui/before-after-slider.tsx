import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) handleMove(e.touches[0].clientX);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video md:aspect-[16/9] rounded-2xl overflow-hidden cursor-ew-resize select-none border border-white/10"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {/* After Image (Background) */}
      <img 
        src={afterImage} 
        alt="Depois"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before Image (Overlay) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={beforeImage} 
          alt="Antes"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPosition / 100)}%` }}
        />
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] uppercase tracking-widest font-bold text-white">
          Antes
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full border border-primary/20 text-[10px] uppercase tracking-widest font-bold text-primary-foreground">
        Depois
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-primary pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-2xl border-4 border-background">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-background rounded-full" />
            <div className="w-0.5 h-3 bg-background rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
