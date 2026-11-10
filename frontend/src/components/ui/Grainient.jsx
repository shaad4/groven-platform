import { useEffect, useRef } from "react";

export default function Grainient({
  color1 = "#dff5ee",
  color2 = "#109875",
  color3 = "#061a15",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();

    window.addEventListener("resize", resize);

    let time = 0;

    const render = () => {
      time += 0.003;

      const width = canvas.width;
      const height = canvas.height;

      const gradient = ctx.createLinearGradient(
        0,
        0,
        width,
        height
      );

      gradient.addColorStop(
        0,
        color1
      );

      gradient.addColorStop(
        0.5 + Math.sin(time) * 0.2,
        color2
      );

      gradient.addColorStop(
        1,
        color3
      );

      ctx.fillStyle = gradient;
      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      // GLOW ORBS
      for (let i = 0; i < 5; i++) {
        const x =
          width / 2 +
          Math.sin(time + i) *
            width *
            0.35;

        const y =
          height / 2 +
          Math.cos(time + i * 2) *
            height *
            0.35;

        const radius =
          200 + Math.sin(time + i) * 50;

        const orb =
          ctx.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            radius
          );

        orb.addColorStop(
          0,
          "rgba(16,152,117,0.18)"
        );

        orb.addColorStop(
          1,
          "rgba(16,152,117,0)"
        );

        ctx.fillStyle = orb;

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.fill();
      }

      animationFrameId =
        requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(
        animationFrameId
      );

      window.removeEventListener(
        "resize",
        resize
      );
    };
  }, [color1, color2, color3]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}