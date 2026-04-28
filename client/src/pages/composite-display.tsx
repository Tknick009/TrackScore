import { useParams } from "wouter";
import { CompositeDisplay } from "@/components/display/CompositeDisplay";

export default function CompositeDisplayPage() {
  const params = useParams();
  const layoutId = parseInt(params.layoutId || '0');

  if (!layoutId || isNaN(layoutId)) {
    return (
      <div className="h-screen w-screen bg-[hsl(var(--display-bg))] flex items-center justify-center">
        <div className="text-[hsl(var(--display-warning))] font-stadium text-3xl">
          Invalid layout ID
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[hsl(var(--display-bg))]" data-testid="composite-display-page">
      <CompositeDisplay layoutId={layoutId} />
    </div>
  );
}
