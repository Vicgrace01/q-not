"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const routeCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-5.6, 0.04, 9.8),
    new THREE.Vector3(-3.7, 0.04, 6.4),
    new THREE.Vector3(1.7, 0.04, 4.8),
    new THREE.Vector3(6.7, 0.04, 2.1),
    new THREE.Vector3(7.1, 0.04, -1.8),
    new THREE.Vector3(3.2, 0.04, -4.3),
    new THREE.Vector3(-1.8, 0.04, -6.1),
    new THREE.Vector3(-1.7, 0.04, -9.0),
    new THREE.Vector3(3.5, 0.04, -11.4),
    new THREE.Vector3(9.0, 0.04, -12.5),
  ],
  false,
  "centripetal",
);

function buildRoadRibbon(width: number, height: number, samples = 240) {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = routeCurve.getPointAt(t);
    const tangent = routeCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const left = point.clone().addScaledVector(side, width / 2);
    const right = point.clone().addScaledVector(side, -width / 2);
    left.y += height;
    right.y += height;
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);

    if (i < samples) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Road() {
  const shoulder = useMemo(() => buildRoadRibbon(5.7, 0.025), []);
  const asphalt = useMemo(() => buildRoadRibbon(4.8, 0.055), []);
  const dashes = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const t = 0.025 + index * 0.0225;
      const point = routeCurve.getPointAt(Math.min(t, 0.98));
      const tangent = routeCurve.getTangentAt(Math.min(t, 0.98));
      return {
        key: index,
        position: [point.x, 0.105, point.z] as [number, number, number],
        rotation: Math.atan2(tangent.x, tangent.z),
      };
    });
  }, []);

  return (
    <group>
      <mesh geometry={shoulder} receiveShadow>
        <meshStandardMaterial color="#53645a" roughness={0.92} />
      </mesh>
      <mesh geometry={asphalt} receiveShadow>
        <meshStandardMaterial color="#202c29" roughness={0.94} />
      </mesh>
      {dashes.map((dash) => (
        <mesh key={dash.key} position={dash.position} rotation={[0, dash.rotation, 0]}>
          <boxGeometry args={[0.09, 0.025, 0.48]} />
          <meshStandardMaterial color="#d7f58a" emissive="#9fcf4d" emissiveIntensity={0.42} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[42, 36]} />
        <meshStandardMaterial color="#0c1713" roughness={1} />
      </mesh>
    </group>
  );
}

function Wheel({ position, reducedMotion }: { position: [number, number, number]; reducedMotion: boolean }) {
  const wheel = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (wheel.current && !reducedMotion) wheel.current.rotation.x -= delta * 3.8;
  });

  return (
    <group ref={wheel} position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.43, 0.43, 0.28, 24]} />
        <meshStandardMaterial color="#07100e" roughness={0.86} />
      </mesh>
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.045, 20]} />
        <meshStandardMaterial color="#aab9ad" metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
        <meshStandardMaterial color="#293a34" metalness={0.35} />
      </mesh>
    </group>
  );
}

function Mirror({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 1.28, 1.55, 2.0]}>
      <mesh rotation={[0, 0, side * -0.24]}>
        <boxGeometry args={[0.045, 0.045, 0.5]} />
        <meshStandardMaterial color="#465a50" metalness={0.5} />
      </mesh>
      <mesh position={[side * 0.07, 0.02, 0.25]} castShadow>
        <boxGeometry args={[0.18, 0.22, 0.12]} />
        <meshStandardMaterial color="#101b18" metalness={0.25} roughness={0.35} />
      </mesh>
    </group>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotionSnapshot() {
  return true;
}

function Coach() {
  const coach = useRef<THREE.Group>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );

  useFrame((state) => {
    if (!coach.current) return;
    const t = reducedMotion ? 0.44 : (state.clock.elapsedTime * 0.027 + 0.11) % 1;
    const point = routeCurve.getPointAt(t);
    const tangent = routeCurve.getTangentAt(t).normalize();
    coach.current.position.set(point.x, 0.08 + Math.sin(state.clock.elapsedTime * 2.4) * 0.018, point.z);
    coach.current.rotation.y = Math.atan2(tangent.x, tangent.z);
  });

  return (
    <group ref={coach}>
      {/* Lower chassis and main coach body. The bus faces local +Z. */}
      <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.48, 1.14, 5.15]} />
        <meshStandardMaterial color="#e5eee4" roughness={0.42} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.48, 0.08]} castShadow>
        <boxGeometry args={[2.5, 0.23, 4.95]} />
        <meshStandardMaterial color="#9fca49" roughness={0.48} />
      </mesh>
      <mesh position={[0, 1.51, -0.03]} castShadow>
        <boxGeometry args={[2.34, 0.12, 4.82]} />
        <meshStandardMaterial color="#d8e3d9" roughness={0.52} />
      </mesh>

      {/* Panoramic windshield and front destination panel. */}
      <mesh position={[0, 1.36, 2.585]}>
        <boxGeometry args={[2.02, 0.67, 0.035]} />
        <meshStandardMaterial color="#142b2d" metalness={0.15} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.82, 2.61]}>
        <boxGeometry args={[1.12, 0.22, 0.04]} />
        <meshStandardMaterial color="#101d19" emissive="#b5e85b" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[-0.84, 0.79, 2.61]}>
        <boxGeometry args={[0.42, 0.16, 0.04]} />
        <meshStandardMaterial color="#e8f4be" emissive="#e8f4be" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.84, 0.79, 2.61]}>
        <boxGeometry args={[0.42, 0.16, 0.04]} />
        <meshStandardMaterial color="#e8f4be" emissive="#e8f4be" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.58, 2.61]}>
        <boxGeometry args={[1.9, 0.16, 0.035]} />
        <meshStandardMaterial color="#9fc74b" />
      </mesh>

      {/* Side windows on both sides. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-1.72, -0.92, -0.12, 0.68, 1.48].map((z) => (
            <mesh key={`${side}-${z}`} position={[side * 1.247, 1.39, z]}>
              <boxGeometry args={[0.025, 0.58, 0.67]} />
              <meshStandardMaterial color="#173036" metalness={0.2} roughness={0.24} />
            </mesh>
          ))}
          <mesh position={[side * 1.255, 0.95, -0.15]}>
            <boxGeometry args={[0.025, 0.12, 1.1]} />
            <meshStandardMaterial color="#9fca49" />
          </mesh>
          <mesh position={[side * 1.27, 0.96, -0.1]}>
            <boxGeometry args={[0.03, 0.2, 0.82]} />
            <meshStandardMaterial color="#0e211b" />
          </mesh>
        </group>
      ))}

      {/* Roof deck and visible Q-not marker on top of the bus. */}
      <mesh position={[0, 1.595, 0]}>
        <boxGeometry args={[1.45, 0.045, 1.85]} />
        <meshStandardMaterial color="#9fc84b" roughness={0.48} />
      </mesh>
      <mesh position={[0, 1.625, -0.06]}>
        <boxGeometry args={[0.92, 0.018, 0.82]} />
        <meshStandardMaterial color="#17261f" />
      </mesh>
      <mesh position={[0, 1.643, -0.06]}>
        <boxGeometry args={[0.52, 0.015, 0.26]} />
        <meshStandardMaterial color="#d7f58a" emissive="#9fcf4d" emissiveIntensity={0.2} />
      </mesh>

      <Mirror side={-1} />
      <Mirror side={1} />
      <Wheel position={[-1.27, 0.43, -1.62]} reducedMotion={reducedMotion} />
      <Wheel position={[1.27, 0.43, -1.62]} reducedMotion={reducedMotion} />
      <Wheel position={[-1.27, 0.43, 1.58]} reducedMotion={reducedMotion} />
      <Wheel position={[1.27, 0.43, 1.58]} reducedMotion={reducedMotion} />
      <mesh position={[0, 1.04, -2.59]}>
        <boxGeometry args={[0.9, 0.24, 0.04]} />
        <meshStandardMaterial color="#15231e" />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 1.25, 7]} />
        <meshStandardMaterial color="#35483a" />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.76, 9, 7]} />
        <meshStandardMaterial color="#253e30" roughness={1} />
      </mesh>
      <mesh position={[0.36, 1.83, -0.08]} castShadow>
        <sphereGeometry args={[0.48, 8, 7]} />
        <meshStandardMaterial color="#314d37" roughness={1} />
      </mesh>
    </group>
  );
}

function Terminal() {
  return (
    <group position={[8.4, 0, -10.1]}>
      <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.2, 3.3, 2.25]} />
        <meshStandardMaterial color="#233a32" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.55, 1.145]}>
        <boxGeometry args={[6.65, 2.15, 0.045]} />
        <meshStandardMaterial color="#46685a" emissive="#1b342a" emissiveIntensity={0.2} metalness={0.32} roughness={0.3} />
      </mesh>
      {[-2.35, -1.18, 0, 1.18, 2.35].map((x) => (
        <mesh key={x} position={[x, 1.55, 1.19]}>
          <boxGeometry args={[0.075, 2.1, 0.07]} />
          <meshStandardMaterial color="#9fb4a4" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 3.38, 0.05]}>
        <boxGeometry args={[7.65, 0.18, 2.55]} />
        <meshStandardMaterial color="#9fc84b" emissive="#60872e" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0.3, 1.34]}>
        <boxGeometry args={[6.8, 0.1, 0.3]} />
        <meshStandardMaterial color="#b8d47a" emissive="#9ac85a" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function City() {
  const blocks: Array<{ position: [number, number, number]; size: [number, number, number] }> = [
    { position: [-10, 1.2, -11], size: [1.6, 2.4, 1.4] },
    { position: [-7.6, 1.8, -13.2], size: [1.5, 3.6, 1.4] },
    { position: [-5.1, 1.1, -12.2], size: [1.5, 2.2, 1.3] },
    { position: [12.2, 1.7, -14.1], size: [1.4, 3.4, 1.3] },
    { position: [14.1, 1.0, -11.5], size: [1.4, 2.0, 1.4] },
  ];
  return (
    <group>
      {blocks.map((block, index) => (
        <mesh key={index} position={block.position} castShadow>
          <boxGeometry args={block.size} />
          <meshStandardMaterial color={index % 2 ? "#192b25" : "#20352d"} roughness={0.95} />
        </mesh>
      ))}
      <Tree position={[-8.2, 0, 2.8]} scale={1.08} />
      <Tree position={[10.5, 0, 4.1]} scale={0.92} />
      <Tree position={[12.7, 0, -5.0]} scale={1.13} />
      <Tree position={[-7.8, 0, -8.8]} scale={0.78} />
    </group>
  );
}

function SceneContents() {
  return (
    <>
      <color attach="background" args={["#0a1511"]} />
      <fog attach="fog" args={["#0a1511", 18, 38]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[3, 13, 8]} intensity={2.0} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[4, 5, 2]} intensity={22} distance={20} color="#c7f36b" />
      <pointLight position={[-4, 4, -8]} intensity={12} distance={14} color="#5b8b78" />
      <Road />
      <City />
      <Terminal />
      <Coach />
    </>
  );
}

export function QNot3DBusScene() {
  return (
    <div className="q-road-3d-canvas" aria-label="Three-dimensional Q-not coach travelling along a curved road">
      <Canvas
        camera={{ position: [13, 15, 18], fov: 38, near: 0.1, far: 100 }}
        dpr={[0.8, 1.35]}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        shadows
      >
        <SceneContents />
      </Canvas>
    </div>
  );
}
