import React, { useEffect, useRef } from 'react';

interface Props {
  darkMode: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const InteractiveBackground: React.FC<Props> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Ajustar el canvas al redimensionar la ventana
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse tracker
    const mouse = { x: -1000, y: -1000, radius: 150 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Crear partículas / Nodos de la Red Neuronal
    const particleCount = Math.floor((width * height) / 14000);
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1.2,
    }));

    // Bucle de animación
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Colores dinámicos según el tema
      const nodeColor = darkMode ? 'rgba(56, 189, 248, ' : 'rgba(2, 132, 199, ';
      const lineColor = darkMode ? 'rgba(14, 165, 233, ' : 'rgba(3, 105, 161, ';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mover partículas
        p.x += p.vx;
        p.y += p.vy;

        // Rebotar en bordes
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Interacción suave con el cursor
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < mouse.radius) {
          const force = (mouse.radius - distMouse) / mouse.radius;
          p.x -= (dxMouse / distMouse) * force * 1.5;
          p.y -= (dyMouse / distMouse) * force * 1.5;
        }

        // Dibujar Nodo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeColor}0.8)`;
        ctx.fill();

        // Conectar con nodos cercanos (Líneas de Red Neural)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * (darkMode ? 0.25 : 0.2);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${lineColor}${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [darkMode]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Fondo degradado base */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          darkMode
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950'
            : 'bg-gradient-to-br from-slate-50 via-sky-50 to-blue-100'
        }`}
      />

      {/* Canvas animado con la Red Neuronal */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full opacity-70" />

      {/* Luces cibernéticas de fondo con animación "Glow" */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse ${
          darkMode ? 'bg-cyan-500' : 'bg-blue-400'
        }`}
      />
      <div
        className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse ${
          darkMode ? 'bg-blue-600' : 'bg-amber-300'
        }`}
        style={{ animationDuration: '6s' }}
      />
    </div>
  );
};