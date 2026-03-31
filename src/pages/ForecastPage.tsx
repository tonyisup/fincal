import { ForecastControlsSidebar } from '@/components/forecast/ForecastControlsSidebar';
import { ForecastMainContent } from '@/components/forecast/ForecastMainContent';

export function ForecastPage() {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      <ForecastControlsSidebar />
      <ForecastMainContent />
    </div>
  );
}
