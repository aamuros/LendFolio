import { SparkleDotsOverlay, SparklesCore } from "@/components/ui/sparkles";

export function AuthSparkleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[min(680px,92vh)] w-[min(760px,95vw)] -translate-x-1/2 -translate-y-1/2">
        <SparklesCore
          id="auth-card-sparkles"
          className="h-full w-full"
          particleColor="#0f5132"
          minSize={1.4}
          maxSize={3.2}
          particleDensity={260}
          speed={0.5}
          opacity={0.9}
        />
        <SparkleDotsOverlay />
      </div>
    </div>
  );
}
