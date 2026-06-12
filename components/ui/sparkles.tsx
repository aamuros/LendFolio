"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { cn } from "@/lib/utils";

type SparklesCoreProps = {
  id?: string;
  className?: string;
  background?: string;
  particleColor?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  speed?: number;
  opacity?: number;
};

const authDotPositions = [
  [6, 21, 2.8, 0.62],
  [12, 63, 2.2, 0.5],
  [16, 40, 3.4, 0.68],
  [20, 78, 2.6, 0.54],
  [25, 15, 2.4, 0.48],
  [28, 55, 3.2, 0.7],
  [34, 29, 2.5, 0.56],
  [38, 86, 3.1, 0.62],
  [43, 18, 2.1, 0.46],
  [47, 70, 2.8, 0.58],
  [52, 10, 3.2, 0.66],
  [56, 91, 2.4, 0.52],
  [61, 24, 2.9, 0.64],
  [65, 76, 3.5, 0.72],
  [69, 42, 2.2, 0.5],
  [73, 17, 2.7, 0.56],
  [78, 58, 3.1, 0.64],
  [83, 33, 2.5, 0.54],
  [88, 71, 3.4, 0.7],
  [92, 46, 2.3, 0.5],
] as const;

const initParticles = async (engine: Parameters<typeof loadSlim>[0]) => {
  await loadSlim(engine);
};

export function SparklesCore({
  id = "lendfolio-sparkles",
  className,
  background = "transparent",
  particleColor = "#0f5132",
  minSize = 1.4,
  maxSize = 3.2,
  particleDensity = 260,
  speed = 0.5,
  opacity = 0.9,
}: SparklesCoreProps) {
  const options = useMemo<ISourceOptions>(
    () => {
      const colorValue =
        particleColor === "#0f5132" ? { r: 15, g: 81, b: 50 } : particleColor;

      return {
        fullScreen: {
          enable: false,
        },
        background: {
          color: {
            value: background,
          },
        },
        fpsLimit: 45,
        detectRetina: true,
        particles: {
          number: {
            value: particleDensity,
            density: {
              enable: true,
            },
          },
          color: {
            value: colorValue,
          },
          opacity: {
            value: {
              min: opacity * 0.35,
              max: opacity,
            },
            animation: {
              enable: true,
              speed: 0.75,
              sync: false,
              startValue: "random",
            },
          },
          size: {
            value: {
              min: minSize,
              max: maxSize,
            },
            animation: {
              enable: true,
              speed: 1,
              sync: false,
              startValue: "random",
            },
          },
          links: {
            enable: false,
          },
          move: {
            enable: true,
            speed,
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "out",
            },
          },
          shape: {
            type: "circle",
          },
        },
        interactivity: {
          detectsOn: "canvas",
          events: {
            onClick: {
              enable: false,
            },
            onHover: {
              enable: false,
            },
            resize: {
              enable: true,
            },
          },
        },
      };
    },
    [background, maxSize, minSize, opacity, particleColor, particleDensity, speed]
  );

  return (
    <ParticlesProvider init={initParticles}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn("pointer-events-none h-full w-full", className)}
        aria-hidden="true"
      >
        <Particles
          id={id}
          className="pointer-events-none h-full w-full"
          options={options}
        />
      </motion.div>
    </ParticlesProvider>
  );
}

export function SparkleDotsOverlay({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden="true">
      {authDotPositions.map(([left, top, size, opacity], index) => {
        const driftX = index % 2 === 0 ? 10 : -12;
        const driftY = index % 3 === 0 ? -14 : 12;

        return (
          <motion.span
            key={`${left}-${top}`}
            className="absolute rounded-full bg-[#0f5132]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              opacity,
            }}
            animate={{
              x: [0, driftX, 0],
              y: [0, driftY, 0],
              opacity: [opacity * 0.45, opacity, opacity * 0.5],
              scale: [0.92, 1.12, 0.96],
            }}
            transition={{
              duration: 5.5 + (index % 5) * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.12,
            }}
          />
        );
      })}
    </div>
  );
}
