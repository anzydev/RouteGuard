'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SplashScreen.module.css';

/**
 * Animated wireframe globe using Canvas 2D.
 * Draws a rotating sphere with latitude/longitude lines and dot markers.
 */
function GlobeCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 110;
    let rotation = 0;

    // City positions (lat, lng in radians)
    const cities = [
      { lat: 19.07, lng: 72.87, label: 'MUM' },   // Mumbai
      { lat: 28.61, lng: 77.20, label: 'DEL' },   // Delhi
      { lat: 13.08, lng: 80.27, label: 'CHN' },   // Chennai
      { lat: 22.57, lng: 88.36, label: 'KOL' },   // Kolkata
      { lat: 12.97, lng: 77.59, label: 'BLR' },   // Bangalore
      { lat: 17.38, lng: 78.49, label: 'HYD' },   // Hyderabad
      { lat: 23.02, lng: 72.57, label: 'AMD' },   // Ahmedabad
      { lat: 26.91, lng: 75.78, label: 'JPR' },   // Jaipur
    ];

    function toRad(deg) { return deg * Math.PI / 180; }

    function project(lat, lng, rot) {
      const phi = toRad(90 - lat);
      const theta = toRad(lng) + rot;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = -radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      // Only show front hemisphere
      return { x: cx + x, y: cy + y, z, visible: z > -20 };
    }

    function draw() {
      ctx.clearRect(0, 0, size, size);

      // Outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.3);
      glowGrad.addColorStop(0, 'rgba(103, 80, 164, 0.08)');
      glowGrad.addColorStop(1, 'rgba(103, 80, 164, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, size, size);

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(103, 80, 164, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner gradient fill
      const innerGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, radius);
      innerGrad.addColorStop(0, 'rgba(103, 80, 164, 0.06)');
      innerGrad.addColorStop(1, 'rgba(103, 80, 164, 0.01)');
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lng = 0; lng <= 360; lng += 3) {
          const p = project(lat, lng, rotation);
          if (p.visible) {
            if (first) { ctx.moveTo(p.x, p.y); first = false; }
            else ctx.lineTo(p.x, p.y);
          } else {
            first = true;
          }
        }
        ctx.strokeStyle = `rgba(103, 80, 164, ${0.12 + Math.abs(lat) * 0.001})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Longitude lines
      for (let lng = 0; lng < 360; lng += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lat, lng, rotation);
          if (p.visible) {
            if (first) { ctx.moveTo(p.x, p.y); first = false; }
            else ctx.lineTo(p.x, p.y);
          } else {
            first = true;
          }
        }
        ctx.strokeStyle = 'rgba(103, 80, 164, 0.1)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // City dots
      cities.forEach((city) => {
        const p = project(city.lat, city.lng, rotation);
        if (p.visible) {
          const alpha = 0.3 + (p.z / radius) * 0.7;

          // Glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(206, 147, 216, ${alpha * 0.15})`;
          ctx.fill();

          // Dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(206, 147, 216, ${alpha})`;
          ctx.fill();
        }
      });

      // Draw connections (supply routes) between adjacent cities
      const routes = [[0, 4], [1, 7], [2, 4], [3, 5], [4, 5], [0, 6], [1, 6]];
      routes.forEach(([a, b]) => {
        const pA = project(cities[a].lat, cities[a].lng, rotation);
        const pB = project(cities[b].lat, cities[b].lng, rotation);
        if (pA.visible && pB.visible) {
          const alpha = Math.min((pA.z + pB.z) / (radius * 2), 0.5);
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          // Curved arc
          const midX = (pA.x + pB.x) / 2;
          const midY = (pA.y + pB.y) / 2 - 15;
          ctx.quadraticCurveTo(midX, midY, pB.x, pB.y);
          ctx.strokeStyle = `rgba(103, 80, 164, ${alpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      rotation += 0.004;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: 280, height: 280 }} />;
}

/**
 * Cinematic splash screen with animated globe, gradient text, and loading bar.
 */
export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [status, setStatus] = useState('Initializing simulation engine...');

  useEffect(() => {
    const statuses = [
      'Loading route network...',
      'Calibrating risk models...',
      'Connecting AI decision engine...',
      'Mapping supply chain nodes...',
      'Ready.',
    ];

    statuses.forEach((msg, i) => {
      setTimeout(() => setStatus(msg), 600 + i * 500);
    });

    // Auto-dismiss after loading
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onComplete(), 800);
    }, 3200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Generate random particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 2,
    duration: `${6 + Math.random() * 8}s`,
    delay: `${Math.random() * 4}s`,
    opacity: 0.2 + Math.random() * 0.4,
  }));

  return (
    <div className={`${styles.splash} ${exiting ? styles.splash_exiting : ''}`}>
      {/* Background */}
      <div className={styles.splash__bg}>
        <div className={styles.splash__gradient1} />
        <div className={styles.splash__gradient2} />
        <div className={styles.splash__gradient3} />
      </div>

      {/* Perspective Grid */}
      <div className={styles.splash__grid} />

      {/* Floating Particles */}
      <div className={styles.splash__particles}>
        {particles.map((p) => (
          <div
            key={p.id}
            className={styles.splash__particle}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Globe */}
      <div className={styles.splash__globe}>
        <div className={styles.splash__globe_glow} />
        <div className={styles.splash__globe_glow2} />
        <GlobeCanvas />
      </div>

      {/* Title */}
      <div className={styles.splash__content}>
        <h1 className={styles.splash__title}>
          Supply Chain Simulator
        </h1>
        <p className={styles.splash__subtitle}>
          AI-Powered Decision Engine
        </p>

        {/* Loading Bar */}
        <div className={styles.splash__loader}>
          <div className={styles.splash__loader_fill} />
        </div>
        <p className={styles.splash__status}>{status}</p>
      </div>
    </div>
  );
}
