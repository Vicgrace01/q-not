"use client";

import { Suspense, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

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

const routeCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-8.8, 0.035, 8.6),
    new THREE.Vector3(-6.4, 0.035, 5.6),
    new THREE.Vector3(-2.1, 0.035, 4.0),
    new THREE.Vector3(3.0, 0.035, 2.0),
    new THREE.Vector3(7.0, 0.035, -1.0),
    new THREE.Vector3(5.8, 0.035, -4.2),
    new THREE.Vector3(1.2, 0.035, -6.4),
    new THREE.Vector3(-3.4, 0.035, -8.8),
    new THREE.Vector3(-1.0, 0.035, -11.1),
    new THREE.Vector3(5.4, 0.035, -12.4),
    new THREE.Vector3(10.8, 0.035, -11.2),
  ],
  false,
  "centripetal",
);

function buildRoadRibbon(width: number, height: number, samples = 280) {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = routeCurve.getPointAt(t);
    const tangent = routeCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const left = point.clone().addScaledVector(side, width / 2);
    const right = point.clone().addScaledVector(side, -width / 2);
    left.y += height;
    right.y += height;
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);

    if (index < samples) {
      const first = index * 2;
      indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildRoadOffsetRibbon(width: number, height: number, offset: number, samples = 280) {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = routeCurve.getPointAt(t);
    const tangent = routeCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const center = point.clone().addScaledVector(side, offset);
    const left = center.clone().addScaledVector(side, width / 2);
    const right = center.clone().addScaledVector(side, -width / 2);
    left.y += height;
    right.y += height;
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);

    if (index < samples) {
      const first = index * 2;
      indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const SHOULDER_GEOMETRY = buildRoadRibbon(6.25, 0.025);
const ROAD_GEOMETRY = buildRoadRibbon(5.0, 0.065);
const ROAD_EDGE_LEFT = buildRoadOffsetRibbon(0.105, 0.09, 2.34);
const ROAD_EDGE_RIGHT = buildRoadOffsetRibbon(0.105, 0.09, -2.34);
const CURB_LEFT = buildRoadOffsetRibbon(0.22, 0.045, 2.72);
const CURB_RIGHT = buildRoadOffsetRibbon(0.22, 0.045, -2.72);
const ROUTE_GLOW_GEOMETRY = new THREE.TubeGeometry(routeCurve, 280, 0.035, 6, false);

function Road() {
  const laneMarks = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => {
        const t = 0.025 + index * 0.0275;
        const safeT = Math.min(t, 0.975);
        const point = routeCurve.getPointAt(safeT);
        const tangent = routeCurve.getTangentAt(safeT);
        return {
          key: index,
          position: [point.x, 0.105, point.z] as [number, number, number],
          rotation: Math.atan2(tangent.x, tangent.z),
        };
      }),
    [],
  );
  const roadReflectors = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => {
        const t = 0.035 + index * 0.043;
        const safeT = Math.min(t, 0.965);
        const point = routeCurve.getPointAt(safeT);
        const tangent = routeCurve.getTangentAt(safeT).normalize();
        const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
        return [-1, 1].map((direction) => ({
          key: `${index}-${direction}`,
          position: [point.x + side.x * 2.78 * direction, 0.17, point.z + side.z * 2.78 * direction] as [number, number, number],
          rotation: Math.atan2(tangent.x, tangent.z),
        }));
      }).flat(),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[48, 42]} />
        <meshStandardMaterial color="#08120e" roughness={1} />
      </mesh>
      <mesh geometry={SHOULDER_GEOMETRY} receiveShadow>
        <meshStandardMaterial color="#6d796e" roughness={0.93} />
      </mesh>
      <mesh geometry={ROAD_GEOMETRY} receiveShadow>
        <meshStandardMaterial color="#1b2723" roughness={0.78} metalness={0.1} />
      </mesh>
      <mesh geometry={CURB_LEFT} receiveShadow>
        <meshStandardMaterial color="#65766a" roughness={0.9} />
      </mesh>
      <mesh geometry={CURB_RIGHT} receiveShadow>
        <meshStandardMaterial color="#65766a" roughness={0.9} />
      </mesh>
      <mesh geometry={ROAD_EDGE_LEFT}>
        <meshStandardMaterial color="#d6e5d1" emissive="#9abf76" emissiveIntensity={0.12} roughness={0.72} />
      </mesh>
      <mesh geometry={ROAD_EDGE_RIGHT}>
        <meshStandardMaterial color="#d6e5d1" emissive="#9abf76" emissiveIntensity={0.12} roughness={0.72} />
      </mesh>
      <mesh geometry={ROUTE_GLOW_GEOMETRY} position={[0, 0.018, 0]}>
        <meshBasicMaterial color="#a9d85b" transparent opacity={0.18} />
      </mesh>
      {laneMarks.map((mark) => (
        <mesh key={mark.key} position={mark.position} rotation={[0, mark.rotation, 0]}>
          <boxGeometry args={[0.085, 0.022, 0.48]} />
          <meshStandardMaterial color="#e9f1df" emissive="#b7d88b" emissiveIntensity={0.24} roughness={0.65} />
        </mesh>
      ))}
      {roadReflectors.map((reflector) => (
        <mesh key={reflector.key} position={reflector.position} rotation={[0, reflector.rotation, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.07]} />
          <meshStandardMaterial color="#c7f36b" emissive="#a9d85b" emissiveIntensity={0.48} roughness={0.38} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 1.16, 10]} />
        <meshStandardMaterial color="#4a5945" roughness={0.94} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <icosahedronGeometry args={[0.82, 1]} />
        <meshStandardMaterial color="#18382a" roughness={1} />
      </mesh>
      <mesh position={[0.36, 1.75, -0.13]} castShadow>
        <icosahedronGeometry args={[0.49, 1]} />
        <meshStandardMaterial color="#244632" roughness={1} />
      </mesh>
    </group>
  );
}

function Building({ position, size, index }: { position: [number, number, number]; size: [number, number, number]; index: number }) {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={index % 2 ? "#172922" : "#21362d"} roughness={0.91} />
      </mesh>
      {Array.from({ length: Math.max(2, Math.floor(size[1] / 0.75)) }, (_, row) => (
        <mesh key={row} position={[0, 0.5 + row * 0.72, size[2] / 2 + 0.008]}>
          <boxGeometry args={[size[0] * 0.64, 0.19, 0.018]} />
          <meshStandardMaterial color="#304c3d" emissive="#9acb54" emissiveIntensity={0.075} />
        </mesh>
      ))}
    </group>
  );
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.075, 4.0, 12]} />
        <meshStandardMaterial color="#40564a" metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh position={[0.38, 3.95, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.86, 0.09, 0.12]} />
        <meshStandardMaterial color="#637a5c" metalness={0.3} roughness={0.36} />
      </mesh>
      <mesh position={[0.72, 3.86, 0]}>
        <boxGeometry args={[0.35, 0.07, 0.24]} />
        <meshStandardMaterial color="#d6ff8c" emissive="#d6ff8c" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0.72, 3.72, 0]} color="#d6ff9a" intensity={2.0} distance={7} decay={2} />
    </group>
  );
}

function Terminal() {
  return (
    <group position={[9.0, 0, -10.7]}>
      <mesh position={[0, 1.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.7, 2.9, 2.35]} />
        <meshStandardMaterial color="#1d3028" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.44, 1.19]}>
        <boxGeometry args={[7.08, 2.05, 0.045]} />
        <meshStandardMaterial color="#395e4d" emissive="#183b2a" emissiveIntensity={0.23} metalness={0.25} roughness={0.24} />
      </mesh>
      {[-2.75, -1.65, -0.55, 0.55, 1.65, 2.75].map((x) => (
        <mesh key={x} position={[x, 1.43, 1.23]}>
          <boxGeometry args={[0.065, 1.98, 0.07]} />
          <meshStandardMaterial color="#a6b9a6" metalness={0.55} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 3.0, 0.03]} castShadow>
        <boxGeometry args={[8.2, 0.19, 2.72]} />
        <meshStandardMaterial color="#a9ce55" metalness={0.35} roughness={0.32} emissive="#4d6a24" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.19, 1.39]}>
        <boxGeometry args={[7.1, 0.09, 0.27]} />
        <meshStandardMaterial color="#b9d878" emissive="#9ac85a" emissiveIntensity={0.38} />
      </mesh>
      <mesh position={[0, 3.25, -0.9]}>
        <boxGeometry args={[7.1, 0.08, 0.12]} />
        <meshStandardMaterial color="#758d75" metalness={0.6} />
      </mesh>
    </group>
  );
}

function City() {
  const buildings: Array<{ position: [number, number, number]; size: [number, number, number] }> = [
    { position: [-11.4, 0, -10.6], size: [2.4, 3.5, 2.0] },
    { position: [-8.3, 0, -13.0], size: [2.1, 4.8, 1.8] },
    { position: [-4.8, 0, -12.5], size: [2.0, 3.0, 1.9] },
    { position: [13.5, 0, -14.0], size: [2.1, 4.0, 1.8] },
    { position: [16.2, 0, -10.4], size: [2.4, 2.9, 2.0] },
    { position: [-12.2, 0, 5.5], size: [2.0, 2.7, 1.8] },
  ];

  return (
    <group>
      {buildings.map((building, index) => (
        <Building key={index} {...building} index={index} />
      ))}
      <Tree position={[-9.0, 0, 2.8]} scale={1.1} />
      <Tree position={[10.6, 0, 4.4]} scale={0.95} />
      <Tree position={[13.1, 0, -4.1]} scale={1.1} />
      <Tree position={[-8.1, 0, -7.5]} scale={0.82} />
      <StreetLamp position={[-6.7, 0, 1.1]} />
      <StreetLamp position={[7.2, 0, 5.5]} />
      <StreetLamp position={[11.0, 0, -5.6]} />
      <StreetLamp position={[-8.7, 0, -4.4]} />
    </group>
  );
}

function Coach({ motionSpeed, once }: { motionSpeed: number; once: boolean }) {
  const coach = useRef<THREE.Group>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const { scene } = useGLTF("/models/qnot-coach-premium.glb");
  const vehicle = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);
  const elapsedSeconds = useRef(0);
  const wheels = useMemo(() => {
    const found: THREE.Object3D[] = [];
    vehicle.traverse((object) => {
      if (object.name.startsWith("Tyre_")) found.push(object);
    });
    return found;
  }, [vehicle]);

  useFrame((_, delta) => {
    if (!coach.current) return;
    elapsedSeconds.current += delta;
    const elapsed = elapsedSeconds.current * 0.027 * Math.min(motionSpeed, 12) + 0.035;
    const progress = reducedMotion ? 0.46 : once ? Math.min(elapsed, 0.985) : elapsed % 1;
    const point = routeCurve.getPointAt(progress);
    const tangent = routeCurve.getTangentAt(progress).normalize();
    coach.current.position.set(point.x, 0.02 + (reducedMotion ? 0 : Math.sin(elapsedSeconds.current * 2.1) * 0.012), point.z);
    coach.current.rotation.y = Math.atan2(tangent.x, tangent.z);

    if (!reducedMotion) {
      const spin = delta * 3.2 * Math.min(motionSpeed, 2.0);
      wheels.forEach((wheel) => { wheel.rotation.x -= spin; });
    }
  });

  return (
    <group ref={coach} scale={0.78}>
      <primitive object={vehicle} />
      <pointLight position={[-0.72, 1.14, 2.65]} color="#e9ffd0" intensity={2.8} distance={6} decay={2} />
      <pointLight position={[0.72, 1.14, 2.65]} color="#e9ffd0" intensity={2.8} distance={6} decay={2} />
    </group>
  );
}

useGLTF.preload("/models/qnot-coach-premium.glb");

function SceneContents({ motionSpeed, once }: { motionSpeed: number; once: boolean }) {
  return (
    <>
      <color attach="background" args={["#08140f"]} />
      <fog attach="fog" args={["#08140f", 19, 42]} />
      <hemisphereLight args={["#d8e8d8", "#0d1b13", 0.8]} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[5, 14, 8]} intensity={2.0} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[2, 6, 1]} intensity={15} distance={24} color="#c7f36b" />
      <pointLight position={[-7, 4, -8]} intensity={10} distance={18} color="#4d8868" />
      <Road />
      <City />
      <Terminal />
      <Coach motionSpeed={motionSpeed} once={once} />
    </>
  );
}

export function QNot3DBusScene({ motionSpeed = 1, once = false }: { motionSpeed?: number; once?: boolean } = {}) {
  return (
    <div className="q-road-3d-canvas" aria-label="Three-dimensional Q-not coach travelling through a terminal network">
      <Canvas
        camera={{ position: [15, 15, 19], fov: 38, near: 0.1, far: 110 }}
        dpr={[0.7, 1.35]}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        shadows={{ type: THREE.PCFShadowMap }}
      >
        <Suspense fallback={null}>
          <SceneContents motionSpeed={motionSpeed} once={once} />
        </Suspense>
      </Canvas>
    </div>
  );
}
