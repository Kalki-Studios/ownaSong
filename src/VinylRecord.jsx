import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTransition, animated } from '@react-spring/three';
import * as THREE from 'three';

// ─── Realistic Vinyl Disc Texture ──────────────────────────────────────────
function makeVinylTexture() {
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  // Base — near-black with warm undertone
  ctx.fillStyle = '#100609';
  ctx.fillRect(0, 0, size, size);

  // Groove bands: alternating ultra-thin rings with randomized opacity & width
  for (let r = size * 0.48; r > size * 0.17; r -= 2.8) {
    const t = (r - size * 0.17) / (size * 0.48 - size * 0.17); // 0-1, outer→inner
    // Slight colour shift: inner warmer
    const bright = 0.012 + Math.random() * 0.022;
    const warm = t < 0.3 ? 0.04 : 0;
    ctx.strokeStyle = `rgba(${Math.round(255 * (bright + warm))},${Math.round(255 * bright)},${Math.round(255 * bright)},1)`;
    ctx.lineWidth = Math.random() > 0.85 ? 1.8 : 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Iridescent highlight band — narrow arc sweep
  for (let a = 0; a < Math.PI * 2; a += 0.001) {
    const r0 = size * 0.22;
    const r1 = size * 0.46;
    const bright = 0.08 + 0.12 * Math.sin(a * 3.1 + 1.2);
    if (bright < 0.09) continue;
    ctx.strokeStyle = `rgba(200,180,255,${bright * 0.18})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r0 + (r1 - r0) * (0.5 + 0.5 * Math.sin(a * 7)), a, a + 0.004);
    ctx.stroke();
  }

  // Runout groove edge — smooth transition band
  const runout = ctx.createRadialGradient(cx, cy, size * 0.16, cx, cy, size * 0.195);
  runout.addColorStop(0, 'rgba(40,15,20,0)');
  runout.addColorStop(1, 'rgba(40,15,20,0.7)');
  ctx.fillStyle = runout;
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.195, 0, Math.PI * 2); ctx.fill();

  // Outer dead-wax edge
  const edge = ctx.createRadialGradient(cx, cy, size * 0.475, cx, cy, size * 0.5);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = edge;
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2); ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  return tex;
}

// ─── Realistic Vinyl Normal Map ─────────────────────────────────────────────
function makeGrooveNormalMap() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  ctx.fillStyle = '#8080ff'; // flat normal
  ctx.fillRect(0, 0, size, size);
  for (let r = size * 0.48; r > size * 0.17; r -= 2.8) {
    const phase = (r % 8) / 8;
    const rg = Math.round(100 + phase * 80);
    ctx.strokeStyle = `rgb(${rg},${rg},255)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

// ─── Roughness Map ──────────────────────────────────────────────────────────
function makeRoughnessMap() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  // Label area = smooth, groove area = slightly rough
  const rad = ctx.createRadialGradient(256, 256, 80, 256, 256, 256);
  rad.addColorStop(0, '#555');   // label: moderate roughness
  rad.addColorStop(0.35, '#333');
  rad.addColorStop(0.36, '#1a1a1a'); // groove: low (shiny)
  rad.addColorStop(1, '#222');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// ─── Label Texture ───────────────────────────────────────────────────────────
function makeLabelTexture(song) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;

  // Gradient fill
  const g = ctx.createRadialGradient(cx, cx * 0.7, 0, cx, cx, cx);
  g.addColorStop(0, song.color1);
  g.addColorStop(0.7, song.color2);
  g.addColorStop(1, '#0a0406');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric press rings on label
  for (let r = cx - 10; r > 30; r -= 18) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke();
  }

  // Brand text top
  ctx.fillStyle = 'rgba(255,249,246,0.5)';
  ctx.font = '500 16px "Work Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OWN A SONG  •  CUSTOM STUDIOS', cx, 145);

  // Divider line
  ctx.strokeStyle = 'rgba(255,249,246,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 90, 158); ctx.lineTo(cx + 90, 158); ctx.stroke();

  // Title
  ctx.fillStyle = '#FFF9F6';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.font = '700 42px "Fraunces", serif';
  ctx.fillText(song.title.toUpperCase(), cx, 220);

  // Artist
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,249,246,0.75)';
  ctx.font = '400 22px "Work Sans", sans-serif';
  ctx.fillText(song.artist, cx, 260);

  // Side A indicator
  ctx.fillStyle = 'rgba(255,249,246,0.4)';
  ctx.font = '600 14px "Work Sans", sans-serif';
  ctx.fillText('SIDE A  •  33⅓ RPM', cx, 310);

  // Spindle hole
  ctx.fillStyle = '#0a0406';
  ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.beginPath(); ctx.arc(cx, cx, 14, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Sheen highlight
  const shine = ctx.createLinearGradient(cx - 100, cx - 100, cx + 60, cx + 60);
  shine.addColorStop(0, 'rgba(255,255,255,0.12)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath(); ctx.arc(cx, cx, cx - 2, 0, Math.PI * 2); ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  return tex;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VinylRecord({ activeSong, targetSpeed = 0.015, onDragStart, onDragRate, onDragEnd }) {
  const groupRef          = useRef();
  const tiltGroupRef      = useRef();
  const recordRef         = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const spinSpeed         = useRef(0.015);
  const lastAngleRef      = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const momentumRef       = useRef(0);
  const scratchTickRef    = useRef(0);
  const { gl } = useThree();

  // Textures — memoized once
  const vinylTex    = useMemo(() => makeVinylTexture(), []);
  const normalTex   = useMemo(() => makeGrooveNormalMap(), []);
  const roughnessTex = useMemo(() => makeRoughnessMap(), []);

  // Label crossfade
  const transitions = useTransition(activeSong, {
    key: s => s.id,
    from:  { opacity: 0, scale: 0.82 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 1.12 },
    config: { tension: 130, friction: 26 },
  });

  // ── Physics frame ────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    // 1. Magnetic tilt — pointer tracking
    const px = state.pointer.x, py = state.pointer.y;
    const tiltX = (isHovered && !isDragging) ? py * -0.18 : 0;
    const tiltZ = (isHovered && !isDragging) ? px * -0.18 : 0;
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.x = THREE.MathUtils.damp(tiltGroupRef.current.rotation.x, tiltX, 5, dt);
      tiltGroupRef.current.rotation.z = THREE.MathUtils.damp(tiltGroupRef.current.rotation.z, tiltZ, 5, dt);
    }

    // 2. Spin & momentum
    if (recordRef.current && !isDragging) {
      // Damp current speed toward target
      spinSpeed.current = THREE.MathUtils.damp(spinSpeed.current, targetSpeed, 1.8, dt);
      recordRef.current.rotation.y += spinSpeed.current;
    } else if (isDragging && recordRef.current) {
      // During drag: record already updated in pointer handler; store momentum
      momentumRef.current = spinSpeed.current;
    }

  });

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setIsDragging(true);
    gl.domElement.style.cursor = 'grabbing';
    const local = groupRef.current.worldToLocal(e.point.clone());
    lastAngleRef.current = Math.atan2(local.x, local.z);
    lastPointerTimeRef.current = performance.now();
    momentumRef.current = 0;
    onDragStart?.();
  }, [gl, onDragStart]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !recordRef.current || !groupRef.current) return;
    e.stopPropagation();
    const local = groupRef.current.worldToLocal(e.point.clone());
    const cur = Math.atan2(local.x, local.z);
    let dA = cur - lastAngleRef.current;
    if (dA > Math.PI)  dA -= Math.PI * 2;
    if (dA < -Math.PI) dA += Math.PI * 2;
    recordRef.current.rotation.y += dA;
    // Exponential smooth momentum
    spinSpeed.current = THREE.MathUtils.lerp(spinSpeed.current, dA * 0.85, 0.4);

    // Compute angular velocity → audio rate
    const now = performance.now();
    const dt = Math.max((now - lastPointerTimeRef.current) / 1000, 0.008);
    const rps = (dA / (2 * Math.PI)) / dt; // revolutions per second
    const rate = Math.max(-10, Math.min(10, rps * 1.8)); // 33⅓RPM ≈ rate 1
    onDragRate?.(rate);

    lastAngleRef.current = cur;
    lastPointerTimeRef.current = now;
  }, [isDragging, onDragRate]);

  const handlePointerUp = useCallback((e) => {
    e.stopPropagation();
    if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    gl.domElement.style.cursor = isHovered ? 'grab' : 'auto';
    onDragEnd?.();
  }, [gl, isHovered, onDragEnd]);

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>

      {/* ── TILT GROUP (record only) ── */}
      <group
        ref={tiltGroupRef}
        onPointerEnter={() => { setIsHovered(true); if (!isDragging) gl.domElement.style.cursor = 'grab'; }}
        onPointerLeave={() => { setIsHovered(false); if (!isDragging) gl.domElement.style.cursor = 'auto'; }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerOut={(e) => { if (isDragging) return; setIsHovered(false); }}
      >
        <group ref={recordRef}>

          {/* ── Platter mat (felt) — sits just below disc ── */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[2.78, 2.78, 0.015, 128]} />
            <meshStandardMaterial color="#1a0f0f" roughness={0.97} metalness={0.0} />
          </mesh>

          {/* ── Main vinyl disc ── */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[2.8, 2.8, 0.065, 192, 1]} />
            <meshStandardMaterial
              color="#0d0508"
              roughness={0.12}
              metalness={0.88}
              map={vinylTex}
              normalMap={normalTex}
              normalScale={new THREE.Vector2(0.4, 0.4)}
              roughnessMap={roughnessTex}
              envMapIntensity={1.6}
            />
          </mesh>

          {/* ── Label ── */}
          <group position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {transitions((style, song) => (
              <LabelMesh key={song.id} song={song} style={style} />
            ))}
          </group>

          {/* ── Spindle hole (bright chrome pin) ── */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.12, 32]} />
            <meshStandardMaterial color="#d0c8c0" roughness={0.05} metalness={1.0} />
          </mesh>


        </group>
      </group>


    </group>
  );
}

// ─── Label Mesh subcomponent ─────────────────────────────────────────────────
function LabelMesh({ song, style }) {
  const tex = useMemo(() => makeLabelTexture(song), [song]);
  return (
    <animated.mesh scale={style.scale} position={[0, 0, 0.002]}>
      <circleGeometry args={[1.05, 96]} />
      <animated.meshStandardMaterial
        map={tex}
        transparent
        opacity={style.opacity}
        roughness={0.45}
        metalness={0.08}
        envMapIntensity={0.6}
      />
    </animated.mesh>
  );
}
