import { useEffect, useRef } from "react";
import { getEngine } from "@/lib/audio/engine";
import { useStudio } from "@/lib/store";

export function MasterMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = useStudio((s) => s.playing);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const freq = new Uint8Array(128);

    const draw = () => {
      const { width, height } = canvas;
      ctx2d.clearRect(0, 0, width, height);
      const analyser = getEngine().getAnalyser();
      if (analyser && playing) {
        analyser.getByteFrequencyData(freq);
      } else {
        freq.fill(0);
      }
      const bars = 48;
      const gap = 2;
      const bw = (width - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const sample = freq[Math.floor((i / bars) * freq.length)] ?? 0;
        const idle = playing ? 4 : 2;
        const h = Math.max(idle, (sample / 255) * height * 0.92);
        ctx2d.globalAlpha = playing ? 0.75 : 0.28;
        ctx2d.fillStyle =
          getComputedStyle(document.documentElement).getPropertyValue("--color-fg").trim() ||
          "white";
        ctx2d.fillRect(i * (bw + gap), height - h, bw, h);
      }
      ctx2d.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    let frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={56}
      className="h-10 w-full rounded-sm bg-bg"
      aria-hidden
    />
  );
}
