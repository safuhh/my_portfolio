'use client';

import { useEffect, useRef, useCallback } from 'react';
import { gsap } from '@/lib/gsap';
import { useAccentColor } from '@/lib/AccentColorContext';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { hexToRgba } from '@/lib/colorUtils';
import { features } from '@/data';
import styles from './InteractiveBackgroundCanvas.module.css';

interface PlusSign {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
}

interface MousePosition {
  x: number;
  y: number;
}

// Grid configuration from features data (BASE_GRID_SPACING is the design baseline;
// actual spacing is computed responsively below).
const bgConfig = features.interactiveBackground;
const BASE_GRID_SPACING = bgConfig.grid.spacing;
const PLUS_SIZE = bgConfig.grid.plusSignSize;
const STROKE_WIDTH = bgConfig.grid.strokeWidth;

// Physics constants from features data
const MOUSE_RADIUS = bgConfig.physics.mouseRadius;
const REPULSION_STRENGTH = bgConfig.physics.repulsionStrength;
const RETURN_STRENGTH = bgConfig.physics.returnStrength;
const FRICTION = bgConfig.physics.friction;
const MAX_VELOCITY = bgConfig.physics.maxVelocity;

// Scale grid spacing on large viewports to keep total element count bounded
// on 4K+ displays. Below ~2300px the design baseline (24px) is preserved.
const computeGridSpacing = (viewportWidth: number) =>
  Math.max(BASE_GRID_SPACING, Math.min(40, Math.round(viewportWidth / 96)));

export function InteractiveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plusSignsRef = useRef<PlusSign[]>([]);
  const mouseRef = useRef<MousePosition>({ x: -1000, y: -1000 });
  const isHoveringRef = useRef(false);
  const { color: accentColor } = useAccentColor();
  const reducedMotion = useReducedMotion();

  // Performance optimization: idle state tracking
  const isIdleRef = useRef(true);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMousePosRef = useRef<MousePosition>({ x: -1000, y: -1000 });
  const hasSettledRef = useRef(true);
  const tickerActiveRef = useRef(false);
  const animateRef = useRef<(() => void) | null>(null);
  const gridSpacingRef = useRef(BASE_GRID_SPACING);

  const initializePlusSigns = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    gridSpacingRef.current = computeGridSpacing(window.innerWidth);
    const spacing = gridSpacingRef.current;

    plusSignsRef.current = [];

    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing + spacing / 2;
        const y = row * spacing + spacing / 2;

        plusSignsRef.current.push({
          x,
          y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
        });
      }
    }
  }, []);

  const drawPlusSign = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    opacity: number
  ) => {
    const halfSize = size / 2;

    ctx.strokeStyle = hexToRgba(accentColor, opacity);
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - halfSize, y);
    ctx.lineTo(x + halfSize, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - halfSize);
    ctx.lineTo(x, y + halfSize);
    ctx.stroke();
  }, [accentColor]);

  const startTicker = useCallback(() => {
    if (!tickerActiveRef.current && animateRef.current) {
      gsap.ticker.add(animateRef.current);
      tickerActiveRef.current = true;
    }
  }, []);

  // Build animate function and store in ref so the ticker callback stays stable
  useEffect(() => {
    let warnedContextFailure = false;

    const stopTicker = () => {
      if (tickerActiveRef.current && animateRef.current) {
        gsap.ticker.remove(animateRef.current);
        tickerActiveRef.current = false;
      }
    };

    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        if (canvas && !ctx && !warnedContextFailure) {
          warnedContextFailure = true;
          console.warn('[InteractiveBackgroundCanvas] 2D canvas context unavailable — background will not render.');
        }
        return;
      }

      // Skip rendering when tab is hidden — but stay subscribed to the ticker
      if (document.hidden) return;

      const mouse = mouseRef.current;
      const plusSigns = plusSignsRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Idle + settled: draw static grid once, then unsubscribe from the ticker
      if (isIdleRef.current && hasSettledRef.current) {
        plusSigns.forEach((plus) => {
          drawPlusSign(ctx, plus.originX, plus.originY, PLUS_SIZE, 0.12);
        });
        stopTicker();
        return;
      }

      let maxMovement = 0;

      plusSigns.forEach((plus) => {
        const dx = mouse.x - plus.x;
        const dy = mouse.y - plus.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MOUSE_RADIUS && isHoveringRef.current) {
          const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
          const angle = Math.atan2(dy, dx);
          plus.vx -= Math.cos(angle) * force * REPULSION_STRENGTH;
          plus.vy -= Math.sin(angle) * force * REPULSION_STRENGTH;
        }

        const returnDx = plus.originX - plus.x;
        const returnDy = plus.originY - plus.y;
        plus.vx += returnDx * RETURN_STRENGTH;
        plus.vy += returnDy * RETURN_STRENGTH;

        plus.vx *= FRICTION;
        plus.vy *= FRICTION;

        plus.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, plus.vx));
        plus.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, plus.vy));

        plus.x += plus.vx;
        plus.y += plus.vy;

        const movement = Math.abs(plus.x - plus.originX) + Math.abs(plus.y - plus.originY);
        if (movement > maxMovement) maxMovement = movement;

        let opacity = 0.12;
        if (distance < MOUSE_RADIUS && isHoveringRef.current) {
          const glowIntensity = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
          opacity = 0.12 + glowIntensity * 0.4;
        }

        drawPlusSign(ctx, plus.x, plus.y, PLUS_SIZE, opacity);
      });

      hasSettledRef.current = maxMovement < 0.5;
    };

    animateRef.current = animate;
    // Accent color changed → wake the ticker so the static grid repaints in
    // the new colour. The animate body re-stops itself once settled, so this
    // costs at most one frame per change.
    startTicker();
  }, [drawPlusSign, startTicker]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const isInBounds = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

    const dx = x - lastMousePosRef.current.x;
    const dy = y - lastMousePosRef.current.y;
    const hasMoved = Math.abs(dx) > 2 || Math.abs(dy) > 2;

    if (hasMoved && isInBounds) {
      isIdleRef.current = false;
      hasSettledRef.current = false;
      lastMousePosRef.current = { x, y };

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        isIdleRef.current = true;
      }, 150);
    }

    isHoveringRef.current = isInBounds;
    mouseRef.current = { x, y };

    if (isInBounds) startTicker();
  }, [startTicker]);

  useEffect(() => {
    if (reducedMotion) return;

    initializePlusSigns();

    const canvas = canvasRef.current;
    if (!canvas) return;

    window.addEventListener('mousemove', handleMouseMove);

    // Kick off the loop so the static grid renders immediately
    startTicker();

    const handleResize = () => {
      initializePlusSigns();
      // After a resize, the grid needs to redraw at new positions
      hasSettledRef.current = false;
      startTicker();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animateRef.current) {
        gsap.ticker.remove(animateRef.current);
      }
      tickerActiveRef.current = false;
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [initializePlusSigns, handleMouseMove, startTicker, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={styles.interactiveCanvas}
      aria-hidden="true"
    />
  );
}
