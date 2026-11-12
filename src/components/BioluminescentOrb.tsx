"use client";

import React, { useEffect, useRef } from "react";

interface BioluminescentOrbProps {
  isActive?: boolean;
  size?: number;
}

export function BioluminescentOrb({
  isActive = false,
  size = 420,
}: BioluminescentOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const numParticles = 880;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const particles: {
      x: number;
      y: number;
      z: number;
      colorType: "teal" | "aqua" | "platinum" | "lavender";
      radius: number;
    }[] = [];

    for (let i = 0; i < numParticles; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numParticles);
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);

      const mod = i % 14;
      const colorType =
        mod === 0
          ? "lavender"
          : mod < 4
          ? "platinum"
          : mod < 9
          ? "aqua"
          : "teal";

      particles.push({
        x,
        y,
        z,
        colorType,
        radius: mod === 0 ? 1.85 : mod < 4 ? 1.35 : 1.1,
      });
    }

    let angleY = 0;
    let angleX = 0.25;
    let animId = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const center = size / 2;
      const baseRadius = size * 0.39;
      const speed = isActive ? 0.014 : 0.0038;
      angleY += speed;
      angleX = 0.25 + Math.sin(angleY * 0.6) * 0.12;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Subtle core atmospheric glow in #003734 -> transparent
      const radial = ctx.createRadialGradient(
        center,
        center,
        baseRadius * 0.05,
        center,
        center,
        baseRadius * 1.18
      );
      radial.addColorStop(
        0,
        isActive ? "rgba(0, 130, 124, 0.26)" : "rgba(0, 55, 52, 0.28)"
      );
      radial.addColorStop(
        0.65,
        isActive ? "rgba(253, 233, 255, 0.07)" : "rgba(1, 38, 36, 0.05)"
      );
      radial.addColorStop(1, "rgba(1, 38, 36, 0)");
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(center, center, baseRadius * 1.18, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Rotate around Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;

        // Rotate around X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        // Subtle bioluminescent wave distortion
        const wave =
          1 +
          Math.sin(p.y * 5 + angleY * 2.5) * (isActive ? 0.045 : 0.018);

        const scale = 2.4 / (2.8 - z2);
        const projX = center + x1 * baseRadius * wave * scale * 0.86;
        const projY = center + y2 * baseRadius * wave * scale * 0.86;

        const depthAlpha = Math.max(0.08, Math.min(0.95, (z2 + 1.15) / 2.1));

        if (p.colorType === "lavender") {
          ctx.fillStyle = `rgba(253, 233, 255, ${depthAlpha})`;
        } else if (p.colorType === "platinum") {
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha * 0.9})`;
        } else if (p.colorType === "aqua") {
          ctx.fillStyle = `rgba(203, 255, 252, ${depthAlpha * 0.82})`;
        } else {
          ctx.fillStyle = `rgba(0, 130, 124, ${depthAlpha * 0.78})`;
        }

        ctx.beginPath();
        ctx.arc(projX, projY, p.radius * scale * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isActive, size]);

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
    </div>
  );
}

