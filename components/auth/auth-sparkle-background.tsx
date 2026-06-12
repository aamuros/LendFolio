import { SparklesCore } from "@/components/ui/sparkles";

export function AuthSparkleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[42rem] w-[min(42rem,120vw)] -translate-x-1/2 -translate-y-1/2 sm:h-[46rem] sm:w-[min(48rem,92vw)]">
        <SparklesCore
          id="auth-card-sparkles"
          className="h-full w-full"
          particleColor="#1f7a4d"
          minSize={0.45}
          maxSize={1.35}
          particleDensity={115}
          speed={0.55}
          opacity={0.32}
        />
      </div>
      <div className="absolute left-1/2 top-1/2 h-[28rem] w-[min(32rem,105vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f7a4d]/[0.045] blur-3xl" />
    </div>
  );
}
