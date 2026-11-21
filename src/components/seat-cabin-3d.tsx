"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject, type ComponentRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type SeatStatus = "occupied" | "held" | "available" | "selected";
type Layout = "2+1" | "2+2";

type SeatPosition = Readonly<{ number: number; x: number; z: number; status: SeatStatus }>;

function seatColor(status: SeatStatus) {
  if (status === "occupied") return new THREE.Color("#617167");
  if (status === "held") return new THREE.Color("#d88d5d");
  if (status === "selected") return new THREE.Color("#eaffae");
  return new THREE.Color("#8fb94e");
}

type SeatPartTransform = (
  seat: SeatPosition,
  index: number,
  part: THREE.Object3D,
) => void;

type SeatPartTint = (seat: SeatPosition, index: number) => THREE.Color;

/** Update GPU instances without mutating the React-owned seat data. */
function applySeatInstances(
  mesh: THREE.InstancedMesh | null,
  seatPositions: readonly SeatPosition[],
  dummy: THREE.Object3D,
  transform: SeatPartTransform,
  tint: SeatPartTint,
) {
  if (!mesh) return;

  for (let index = 0; index < seatPositions.length; index += 1) {
    const seat = seatPositions[index];
    if (!seat) continue;

    transform(seat, index, dummy);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, tint(seat, index));
  }

  mesh.count = seatPositions.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function applySeatArmInstances(
  mesh: THREE.InstancedMesh | null,
  seatPositions: readonly SeatPosition[],
  dummy: THREE.Object3D,
) {
  if (!mesh) return;

  for (let index = 0; index < seatPositions.length; index += 1) {
    const seat = seatPositions[index];
    if (!seat) continue;

    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex === 0 ? -1 : 1;
      const instance = index * 2 + sideIndex;
      dummy.position.set(seat.x + side * 0.39, 0.83, seat.z + 0.12);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(instance, dummy.matrix);
      mesh.setColorAt(
        instance,
        seat.status === "occupied" ? new THREE.Color("#405047") : new THREE.Color("#526b51"),
      );
    }
  }

  mesh.count = seatPositions.length * 2;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function SeatInstances({
  seats,
  onSeatToggle,
}: {
  seats: readonly SeatPosition[];
  onSeatToggle: (seatNumber: number) => void;
}) {
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const pedestalRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseGeometry = useMemo(() => new RoundedBoxGeometry(0.72, 0.22, 0.76, 4, 0.085), []);
  const backGeometry = useMemo(() => new RoundedBoxGeometry(0.70, 0.92, 0.20, 5, 0.11), []);
  const headGeometry = useMemo(() => new RoundedBoxGeometry(0.56, 0.24, 0.22, 4, 0.09), []);
  const armGeometry = useMemo(() => new RoundedBoxGeometry(0.095, 0.16, 0.63, 4, 0.045), []);
  const pedestalGeometry = useMemo(() => new THREE.CylinderGeometry(0.11, 0.14, 0.40, 16), []);
  const seatCount = seats.length;

  useLayoutEffect(() => {
    applySeatInstances(
      baseRef.current,
      seats,
      dummy,
      (seat, _index, part) => {
        part.position.set(seat.x, 0.66, seat.z + 0.08);
        part.rotation.set(0, 0, 0);
        part.scale.set(1, 1, 1);
      },
      (seat) => seatColor(seat.status),
    );

    applySeatInstances(
      backRef.current,
      seats,
      dummy,
      (seat, _index, part) => {
        part.position.set(seat.x, 1.16, seat.z - 0.25);
        part.rotation.set(0, 0, 0);
        part.scale.set(1, 1, 1);
      },
      (seat) => seatColor(seat.status),
    );

    applySeatInstances(
      headRef.current,
      seats,
      dummy,
      (seat, _index, part) => {
        part.position.set(seat.x, 1.68, seat.z - 0.25);
        part.rotation.set(0, 0, 0);
        part.scale.set(1, 1, 1);
      },
      (seat) => seat.status === "occupied" ? new THREE.Color("#75857a") : new THREE.Color("#a6c76d"),
    );

    applySeatInstances(
      pedestalRef.current,
      seats,
      dummy,
      (seat, _index, part) => {
        part.position.set(seat.x, 0.39, seat.z + 0.08);
        part.rotation.set(0, 0, 0);
        part.scale.set(1, 1, 1);
      },
      () => new THREE.Color("#35463d"),
    );

    applySeatArmInstances(armRef.current, seats, dummy);
  }, [seats, dummy]);

  const selectInstance = (event: ThreeEvent<MouseEvent>) => {
    const index = event.instanceId;
    if (index === undefined) return;
    const seat = seats[index];
    if (!seat || (seat.status !== "available" && seat.status !== "selected")) return;
    event.stopPropagation();
    onSeatToggle(seat.number);
  };

  const selectArmInstance = (event: ThreeEvent<MouseEvent>) => {
    const index = event.instanceId;
    if (index === undefined) return;
    const seat = seats[Math.floor(index / 2)];
    if (!seat || (seat.status !== "available" && seat.status !== "selected")) return;
    event.stopPropagation();
    onSeatToggle(seat.number);
  };

  return (
    <group>
      <instancedMesh ref={pedestalRef} args={[pedestalGeometry, undefined, seatCount]} castShadow receiveShadow onClick={selectInstance}>
        <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.38} />
      </instancedMesh>
      <instancedMesh ref={baseRef} args={[baseGeometry, undefined, seatCount]} castShadow receiveShadow onClick={selectInstance}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.42} metalness={0.025} clearcoat={0.3} clearcoatRoughness={0.45} emissive="#172214" emissiveIntensity={0.13} />
      </instancedMesh>
      <instancedMesh ref={backRef} args={[backGeometry, undefined, seatCount]} castShadow receiveShadow onClick={selectInstance}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.38} metalness={0.025} clearcoat={0.34} clearcoatRoughness={0.42} emissive="#172214" emissiveIntensity={0.13} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[headGeometry, undefined, seatCount]} castShadow receiveShadow onClick={selectInstance}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.4} clearcoat={0.25} />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[armGeometry, undefined, seatCount * 2]} castShadow receiveShadow onClick={selectArmInstance}>
        <meshStandardMaterial color="#ffffff" metalness={0.24} roughness={0.42} />
      </instancedMesh>
    </group>
  );
}

function CabinScene({
  capacity,
  occupied,
  held,
  layout,
  selectedSeats,
  onSeatToggle,
}: {
  capacity: number;
  occupied: number;
  held: number;
  layout: Layout;
  selectedSeats: number[];
  onSeatToggle: (seatNumber: number) => void;
}) {
  const perRow = layout === "2+1" ? 3 : 4;
  const columns = useMemo(() => layout === "2+1" ? [-0.76, -0.20, 0.80] : [-1.02, -0.47, 0.47, 1.02], [layout]);
  const rowGap = 1.03;
  const rows = Math.ceil(capacity / perRow);
  const length = Math.max(5.6, rows * rowGap + 2.1);
  const frontZ = length / 2 - 1.18;
  const seats = useMemo<SeatPosition[]>(() => {
    const positions: SeatPosition[] = [];
    for (let index = 0; index < capacity; index += 1) {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const x = columns[col] ?? 0;
      const baseStatus: SeatStatus = index < occupied ? "occupied" : index < occupied + held ? "held" : "available";
      const status: SeatStatus = baseStatus === "available" && selectedSeats.includes(index + 1) ? "selected" : baseStatus;
      positions.push({ number: index + 1, x, z: frontZ - row * rowGap, status });
    }
    return positions;
  }, [capacity, perRow, occupied, held, selectedSeats, frontZ, rowGap, columns]);

  return (
    <group>
      <RoundedBox args={[3.34, 0.16, length]} radius={0.12} smoothness={5} position={[0, -0.06, 0]} receiveShadow>
        <meshStandardMaterial color="#1b2a23" roughness={0.78} metalness={0.1} />
      </RoundedBox>
      <RoundedBox args={[0.62, 0.025, length - 0.42]} radius={0.02} smoothness={2} position={[0, 0.035, -0.02]}>
        <meshStandardMaterial color="#78877a" roughness={0.82} />
      </RoundedBox>
      {Array.from({ length: Math.floor(length / 0.45) }, (_, index) => (
        <mesh key={index} position={[0, 0.052, -length / 2 + 0.35 + index * 0.45]}>
          <boxGeometry args={[0.57, 0.008, 0.018]} />
          <meshStandardMaterial color="#a7b2a4" roughness={0.72} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RoundedBox args={[0.10, 1.46, length - 0.25]} radius={0.035} smoothness={3} position={[side * 1.62, 0.82, 0]}>
            <meshStandardMaterial color="#263c31" roughness={0.66} metalness={0.12} />
          </RoundedBox>
          {Array.from({ length: rows + 1 }, (_, index) => (
            <RoundedBox key={index} args={[0.038, 0.78, 0.67]} radius={0.045} smoothness={4} position={[side * 1.565, 1.35, frontZ - 0.08 - index * rowGap]}>
              <meshPhysicalMaterial color="#24454a" transparent opacity={0.66} roughness={0.16} metalness={0.28} clearcoat={0.4} />
            </RoundedBox>
          ))}
          <RoundedBox args={[0.22, 0.11, length - 0.45]} radius={0.045} smoothness={4} position={[side * 1.38, 1.78, 0]}>
            <meshStandardMaterial color="#829184" metalness={0.52} roughness={0.28} />
          </RoundedBox>
          <RoundedBox args={[0.42, 0.13, length - 0.52]} radius={0.05} smoothness={4} position={[side * 1.28, 1.96, 0]}>
            <meshStandardMaterial color="#344b3d" roughness={0.46} metalness={0.2} />
          </RoundedBox>
          <RoundedBox args={[0.035, 0.035, length - 0.6]} radius={0.012} smoothness={3} position={[side * 1.48, 2.04, 0]}>
            <meshStandardMaterial color="#c7f36b" emissive="#8cb44a" emissiveIntensity={0.55} />
          </RoundedBox>
          <RoundedBox args={[0.045, 0.16, length - 0.25]} radius={0.018} smoothness={3} position={[side * 1.55, 0.30, 0]}>
            <meshStandardMaterial color="#c7f36b" metalness={0.24} roughness={0.38} />
          </RoundedBox>
        </group>
      ))}
      <RoundedBox args={[2.98, 0.09, length - 0.25]} radius={0.05} smoothness={4} position={[0, 2.27, 0]}>
        <meshStandardMaterial color="#d9e0d3" transparent opacity={0.12} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.10, 0.045, length - 0.55]} radius={0.02} smoothness={3} position={[0, 2.20, 0]}>
        <meshStandardMaterial color="#d6ff8a" emissive="#b9e76a" emissiveIntensity={0.95} />
      </RoundedBox>
      <RoundedBox args={[3.12, 1.84, 0.16]} radius={0.07} smoothness={4} position={[0, 0.95, length / 2 - 0.12]}>
        <meshStandardMaterial color="#20372b" roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[1.48, 0.44, 0.10]} radius={0.05} smoothness={4} position={[0, 1.92, length / 2 - 0.02]}>
        <meshStandardMaterial color="#0c1712" emissive="#9ecb4c" emissiveIntensity={0.12} />
      </RoundedBox>
      <RoundedBox args={[1.15, 0.09, 0.045]} radius={0.025} smoothness={3} position={[0, 1.92, length / 2 + 0.04]}>
        <meshStandardMaterial color="#c7f36b" emissive="#b3e55f" emissiveIntensity={0.65} />
      </RoundedBox>
      <RoundedBox args={[0.88, 0.38, 0.60]} radius={0.09} smoothness={4} position={[-1.03, 0.56, length / 2 - 0.78]}>
        <meshStandardMaterial color="#18251e" roughness={0.55} />
      </RoundedBox>
      <mesh position={[-1.02, 1.15, length / 2 - 0.94]} rotation={[0.55, 0, 0]}>
        <torusGeometry args={[0.23, 0.035, 10, 32]} />
        <meshStandardMaterial color="#63766a" metalness={0.55} roughness={0.34} />
      </mesh>
      <SeatInstances seats={seats} onSeatToggle={onSeatToggle} />
    </group>
  );
}

function ExteriorCoach() {
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

  return <primitive object={vehicle} />;
}

function SeatCameraEntrance({
  cameraRef,
  exteriorRef,
  interiorRef,
}: {
  cameraRef: RefObject<THREE.PerspectiveCamera | null>;
  exteriorRef: RefObject<THREE.Group | null>;
  interiorRef: RefObject<THREE.Group | null>;
}) {
  const elapsed = useRef(0);
  const reducedMotion = useRef(false);
  const startPosition = useMemo(() => new THREE.Vector3(8.1, 5.05, 9.1), []);
  const approachPosition = useMemo(() => new THREE.Vector3(1.75, 2.05, 3.25), []);
  const cabinPosition = useMemo(() => new THREE.Vector3(1.15, 1.95, 2.35), []);
  const startTarget = useMemo(() => new THREE.Vector3(0, 1.34, 0), []);
  const approachTarget = useMemo(() => new THREE.Vector3(0, 1.05, 0.15), []);
  const cabinTarget = useMemo(() => new THREE.Vector3(0, 0.96, -1.05), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useFrame((_, delta) => {
    // The camera is stored in a ref because it is an imperative Three.js object.
    // This keeps React's render-owned values separate from the frame loop.
    const activeCamera = cameraRef.current;
    if (!activeCamera || elapsed.current >= 2) return;

    elapsed.current = Math.min(2, elapsed.current + (reducedMotion.current ? 2 : Math.min(delta, 0.05)));
    const time = elapsed.current;

    if (time <= 1.02) {
      const progress = THREE.MathUtils.smoothstep(time, 0, 1.02);
      activeCamera.position.lerpVectors(startPosition, approachPosition, progress);
      target.lerpVectors(startTarget, approachTarget, progress);
      if (exteriorRef.current) exteriorRef.current.visible = true;
      if (interiorRef.current) interiorRef.current.visible = false;
      activeCamera.fov = THREE.MathUtils.lerp(37, 42, progress);
    } else {
      const progress = THREE.MathUtils.smoothstep(time, 1.02, 2);
      activeCamera.position.lerpVectors(approachPosition, cabinPosition, progress);
      target.lerpVectors(approachTarget, cabinTarget, progress);
      if (exteriorRef.current) exteriorRef.current.visible = false;
      if (interiorRef.current) interiorRef.current.visible = true;
      activeCamera.fov = THREE.MathUtils.lerp(42, 47, progress);
    }

    activeCamera.lookAt(target);
    activeCamera.updateProjectionMatrix();
  });

  return null;
}

useGLTF.preload("/models/qnot-coach-premium.glb");

export function SeatCabin3D({
  capacity,
  occupied,
  held,
  layout,
  selectedSeats = [],
  onSeatToggle = () => undefined,
}: {
  capacity: number;
  occupied: number;
  held: number;
  layout: Layout;
  selectedSeats?: number[];
  onSeatToggle?: (seatNumber: number) => void;
}) {
  const safeCapacity = Math.max(1, Math.min(60, capacity));
  const rows = Math.ceil(safeCapacity / (layout === "2+1" ? 3 : 4));
  const cabinLength = Math.max(5.6, rows * 1.03 + 2.1);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const exteriorRef = useRef<THREE.Group>(null);
  const interiorRef = useRef<THREE.Group>(null);
  const [entranceComplete, setEntranceComplete] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = window.setTimeout(() => {
      controlsRef.current?.saveState();
      setEntranceComplete(true);
    }, reducedMotion ? 80 : 2050);
    return () => window.clearTimeout(finish);
  }, []);

  function runCameraAction(action: "left" | "right" | "up" | "down" | "zoom-in" | "zoom-out" | "reset") {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera || !entranceComplete) return;

    if (action === "reset") {
      controls.reset();
      controls.update();
      return;
    }

    // Use the public camera position and OrbitControls target instead of
    // calling internal rotateLeft/rotateUp methods that are not part of the
    // typed Drei OrbitControls instance API.
    const target = controls.target;
    const offset = camera.position.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    switch (action) {
      case "left": spherical.theta += Math.PI / 7; break;
      case "right": spherical.theta -= Math.PI / 7; break;
      case "up": spherical.phi -= Math.PI / 9; break;
      case "down": spherical.phi += Math.PI / 9; break;
      case "zoom-in": spherical.radius /= 1.18; break;
      case "zoom-out": spherical.radius *= 1.18; break;
    }

    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.48, 1.48);
    spherical.radius = THREE.MathUtils.clamp(
      spherical.radius,
      3.2,
      Math.max(12, cabinLength * 1.5),
    );

    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target));
    controls.update();
  }

  return (
    <Canvas
      camera={{ position: [8.1, 5.05, 9.1], fov: 37, near: 0.1, far: 100 }}
      dpr={[0.8, 1.4]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor("#091711", 0);
        cameraRef.current = camera as THREE.PerspectiveCamera;
      }}
    >
      <Suspense fallback={null}>
        <hemisphereLight args={["#f0f4e8", "#15251d", 0.95]} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[5, 9, 5]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <pointLight position={[-2, 2.8, 0]} color="#d6ff8a" intensity={3.0} distance={13} />
        <pointLight position={[2, 2.4, 0]} color="#8fc4a0" intensity={2.0} distance={12} />
        <group ref={exteriorRef}>
          <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[6.2, 72]} />
            <meshStandardMaterial color="#101a14" roughness={0.92} />
          </mesh>
          <mesh position={[0, -0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[5.45, 5.48, 96]} />
            <meshBasicMaterial color="#9fc95d" transparent opacity={0.42} />
          </mesh>
          <ExteriorCoach />
        </group>
        <group ref={interiorRef} visible={false}>
          <CabinScene
            capacity={safeCapacity}
            occupied={Math.max(0, Math.min(safeCapacity, occupied))}
            held={Math.max(0, Math.min(safeCapacity - occupied, held))}
            layout={layout}
            selectedSeats={selectedSeats}
            onSeatToggle={onSeatToggle}
          />
          <ContactShadows position={[0, -0.02, 0]} opacity={0.34} scale={[5, cabinLength + 1]} blur={2.4} far={3.5} />
        </group>
        <SeatCameraEntrance cameraRef={cameraRef} exteriorRef={exteriorRef} interiorRef={interiorRef} />
        <Html fullscreen style={{ pointerEvents: "none" }}>
          <div
            role="group"
            aria-label="3D bus view controls"
            style={{
              position: "absolute",
              left: "16px",
              bottom: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(3, 38px)",
              gap: "5px",
              padding: "8px",
              border: "1px solid rgba(214,255,120,.24)",
              borderRadius: "12px",
              background: "rgba(5,16,11,.82)",
              boxShadow: "0 8px 28px rgba(0,0,0,.35)",
              backdropFilter: "blur(12px)",
              pointerEvents: "auto",
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {([
              ["", ""], ["up", "↑"], ["", ""],
              ["left", "←"], ["reset", "Reset"], ["right", "→"],
              ["zoom-out", "−"], ["down", "↓"], ["zoom-in", "+"],
            ] as const).map(([action, label], index) => action ? (
              <button
                key={action}
                type="button"
                aria-label={action === "reset" ? "Reset camera view" : `${action.replace("-", " ")} camera`}
                title={action === "reset" ? "Reset view" : label}
                disabled={!entranceComplete}
                onClick={(event) => {
                  event.stopPropagation();
                  runCameraAction(action);
                }}
                style={{
                  width: "38px",
                  height: "34px",
                  padding: "0",
                  border: "1px solid rgba(214,255,120,.2)",
                  borderRadius: "7px",
                  background: action === "reset" ? "rgba(199,243,107,.15)" : "rgba(255,255,255,.055)",
                  color: "#e8f3df",
                  font: "700 13px/1 system-ui, sans-serif",
                  fontSize: action === "reset" ? "9px" : "16px",
                  cursor: entranceComplete ? "pointer" : "wait",
                  opacity: entranceComplete ? 1 : .45,
                  touchAction: "manipulation",
                }}
              >
                {label}
              </button>
            ) : <span key={`spacer-${index}`} aria-hidden="true" />)}
          </div>
        </Html>
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={entranceComplete}
          enablePan={false}
          minDistance={3.2}
          maxDistance={Math.max(12, cabinLength * 1.5)}
          minPolarAngle={0.48}
          maxPolarAngle={1.48}
          target={[0, 0.96, -1.05]}
          rotateSpeed={0.58}
          zoomSpeed={0.68}
          dampingFactor={0.09}
          enableDamping
        />
      </Suspense>
    </Canvas>
  );
}
