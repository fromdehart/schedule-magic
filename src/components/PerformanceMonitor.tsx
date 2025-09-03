import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleLoad = () => {
        const perf = performance;
        const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const newMetrics: PerformanceMetrics = {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: 0,
            firstContentfulPaint: 0
          };

          // Get paint timing if available
          const paintEntries = perf.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            if (entry.name === 'first-paint') {
              newMetrics.firstPaint = entry.startTime;
            }
            if (entry.name === 'first-contentful-paint') {
              newMetrics.firstContentfulPaint = entry.startTime;
            }
          });

          setMetrics(newMetrics);
        }
      };

      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm font-mono z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">Performance</span>
        <button 
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs bg-white/20 px-2 py-1 rounded"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {isVisible && (
        <div className="space-y-1 text-xs">
          <div>DOM Ready: {metrics.domContentLoaded.toFixed(2)}ms</div>
          <div>Load Complete: {metrics.loadComplete.toFixed(2)}ms</div>
          <div>First Paint: {metrics.firstPaint.toFixed(2)}ms</div>
          <div>FCP: {metrics.firstContentfulPaint.toFixed(2)}ms</div>
        </div>
      )}
    </div>
  );
};
