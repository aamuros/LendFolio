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

const initParticles = async (engine: Parameters<typeof loadSlim>[0]) => {
  await loadSlim(engine);
};

export function SparklesCore({
  id = "lendfolio-sparkles",
  className,
  background = "transparent",
  particleColor = "#1f7a4d",
  minSize = 0.4,
  maxSize = 1.2,
  particleDensity = 120,
  speed = 0.6,
  opacity = 0.34,
}: SparklesCoreProps) {
  const options = useMemo<ISourceOptions>(
    () => ({
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
          value: particleColor,
        },
        opacity: {
          value: {
            min: opacity * 0.35,
            max: opacity,
          },
          animation: {
            enable: true,
            speed: 0.55,
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
    }),
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
