"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";

type SeatStatus = "occupied" | "held" | "available";
type Layout = "2+1" | "2+2";

type SeatMeshProps = {
  x: number;
  z: number;
  status: SeatStatus;
};

function SeatMesh({ x, z, status }: SeatMeshProps) {
  const color = status === "occupied" ? "#65716a" : status === "held" ? "#ff985a" : "#d6ff3f";
  const edge = status === "occupied" ? "#3c4943" : status === "held" ? "#bd6035" : "#91b51e";

  return (
    <group position={[x, 0, z]}>
      {/* Seat base and backrest are separate meshes to give each seat real depth. */}
      <mesh position={[0, 0.46, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.16, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.77, 0.23]} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.13]} />
        <meshStandardMaterial color={color} roughness={0.58} />
      </mesh>
      <mesh position={[-0.25, 0.55, 0.02]}>
        <boxGeometry args={[0.07, 0.13, 0.48]} />
        <meshStandardMaterial color={edge} roughness={0.7} />
      </mesh>
      <mesh position={[0.25, 0.55, 0.02]}>
        <boxGeometry args={[0.07, 0.13, 0.48]} />
        <meshStandardMaterial color={edge} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.17, -0.06]}>
        <boxGeometry args={[0.3, 0.36, 0.28]} />
        <meshStandardMaterial color="#28352f" roughness={0.8} />
      </mesh>
    </group>
  );
}

function CabinScene({ capacity, occupied, held, layout }: { capacity: number; occupied: number; held: number; layout: Layout }) {
  const perRow = layout === "2+1" ? 3 : 4;
  const columns = layout === "2+1" ? [-0.82, -0.28, 0.72] : [-1.08, -0.48, 0.48, 1.08];
  const rows = Math.ceil(capacity / perRow);
  const length = Math.max(4.4, rows * 0.86 + 1.4);
  const firstRowZ = -length / 2 + 1.0;
  const seats = Array.from({ length: capacity }, (_, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const status: SeatStatus = index < occupied ? "occupied" : index < occupied + held ? "held" : "available";
    return { key: index + 1, x: columns[col], z: firstRowZ + row * 0.86, status };
  });

  return (
    <group rotation={[0, -0.12, 0]}>
      {/* Open-top coach shell: the floor and low side panels make the cabin readable while orbiting. */}
      <mesh position={[0, -0.09, 0]} receiveShadow>
        <boxGeometry args={[3.45, 0.16, length]} />
        <meshStandardMaterial color="#172c24" roughness={0.86} />
      </mesh>
      <mesh position={[-1.72, 0.55, 0]}>
        <boxGeometry args={[0.07, 1.15, length]} />
        <meshStandardMaterial color="#29443a" transparent opacity={0.42} roughness={0.28} metalness={0.12} />
      </mesh>
      <mesh position={[1.72, 0.55, 0]}>
        <boxGeometry args={[0.07, 1.15, length]} />
        <meshStandardMaterial color="#29443a" transparent opacity={0.42} roughness={0.28} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.1, -length / 2 + 0.18]}>
        <boxGeometry args={[3.35, 0.28, 0.2]} />
        <meshStandardMaterial color="#41544b" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.56, -length / 2 + 0.05]}>
        <boxGeometry args={[3.2, 1.02, 0.08]} />
        <meshStandardMaterial color="#315146" transparent opacity={0.55} roughness={0.22} metalness={0.08} />
      </mesh>
      {/* Centre aisle. */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[layout === "2+1" ? 0.52 : 0.78, 0.025, length - 0.3]} />
        <meshStandardMaterial color="#9aa89a" roughness={0.9} />
      </mesh>
      {seats.map((seat) => <SeatMesh key={seat.key} x={seat.x} z={seat.z} status={seat.status} />)}
      <mesh position={[-1.42, 0.16, 0]}>
        <boxGeometry args={[0.07, 0.22, length - 0.2]} />
        <meshStandardMaterial color="#d6ff3f" roughness={0.55} />
      </mesh>
      <mesh position={[1.42, 0.16, 0]}>
        <boxGeometry args={[0.07, 0.22, length - 0.2]} />
        <meshStandardMaterial color="#d6ff3f" roughness={0.55} />
      </mesh>
    </group>
  );
}

export function SeatCabin3D({
  capacity,
  occupied,
  held,
  layout,
}: {
  capacity: number;
  occupied: number;
  held: number;
  layout: Layout;
}) {
  return (
    <Canvas
      camera={{ position: [5.7, 6.4, 7.2], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor("#0b1c16", 0)}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1.25} />
        <directionalLight position={[4, 7, 5]} intensity={2.1} />
        <pointLight position={[-4, 3, -2]} intensity={0.65} color="#d6ff3f" />
        <CabinScene capacity={capacity} occupied={occupied} held={held} layout={layout} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={5.2}
          maxDistance={11.5}
          minPolarAngle={0.38}
          maxPolarAngle={1.38}
          target={[0, 0.25, 0]}
          rotateSpeed={0.62}
          zoomSpeed={0.7}
        />
      </Suspense>
    </Canvas>
  );
}
