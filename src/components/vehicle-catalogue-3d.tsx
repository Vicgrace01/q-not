"use client";

import { useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";

export const VEHICLE_OPTIONS = [
  { value: "DANFO", label: "Yellow Danfo", capacity: 14, note: "Urban shared minibus" },
  { value: "KOROPE", label: "Korope", capacity: 11, note: "Compact commuter minibus" },
  { value: "HIACE", label: "Hiace / Van", capacity: 14, note: "Passenger van" },
  { value: "COASTER", label: "Coaster", capacity: 30, note: "Medium-capacity bus" },
  { value: "SHUTTLE", label: "Shuttle", capacity: 18, note: "Organised passenger shuttle" },
  { value: "OTHER", label: "Other vehicle", capacity: 4, note: "Register a different service vehicle" },
] as const;

export type VehicleTypeChoice = typeof VEHICLE_OPTIONS[number]["value"];
type VehicleView = "exterior" | "interior";

type VehicleSpec = {
  length: number;
  height: number;
  width: number;
  colour: string;
  windows: number;
  capacity: number;
  accent: string;
};

const SPECS: Record<VehicleTypeChoice, VehicleSpec> = {
  DANFO: { length: 3.55, height: 1.42, width: 1.24, colour: "#efc329", windows: 4, capacity: 14, accent: "#17231b" },
  KOROPE: { length: 3.0, height: 1.35, width: 1.22, colour: "#d9dfdc", windows: 3, capacity: 11, accent: "#84a09a" },
  HIACE: { length: 4.15, height: 1.58, width: 1.35, colour: "#d8dfdc", windows: 5, capacity: 14, accent: "#354b51" },
  COASTER: { length: 6.0, height: 1.9, width: 1.6, colour: "#d4ddd8", windows: 7, capacity: 30, accent: "#7b9b86" },
  SHUTTLE: { length: 4.8, height: 1.68, width: 1.48, colour: "#cbd4d1", windows: 6, capacity: 18, accent: "#8aa15c" },
  OTHER: { length: 3.4, height: 1.4, width: 1.25, colour: "#c9d1cd", windows: 3, capacity: 4, accent: "#8aa15c" },
};

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.18, 28]} />
        <meshStandardMaterial color="#111816" roughness={0.94} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.17, 0.19, 24]} />
        <meshStandardMaterial color="#aab7b1" metalness={0.82} roughness={0.26} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.065, 0.065, 0.2, 16]} />
        <meshStandardMaterial color="#394741" metalness={0.42} roughness={0.38} />
      </mesh>
    </group>
  );
}

function VehicleExterior({ type }: { type: VehicleTypeChoice }) {
  const spec = SPECS[type];
  const wheelXs = type === "COASTER"
    ? [-spec.length * 0.36, 0, spec.length * 0.36]
    : [-spec.length * 0.33, spec.length * 0.33];
  const windowStart = -spec.length * 0.39;
  const usable = spec.length * 0.77;
  const windowGap = usable / Math.max(1, spec.windows);
  const windowWidth = Math.max(0.29, windowGap * 0.76);

  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.length * 0.92, 0.18, spec.width * 1.1]} />
        <meshStandardMaterial color="#111916" metalness={0.32} roughness={0.68} />
      </mesh>
      <RoundedBox args={[spec.length, spec.height, spec.width]} radius={0.13} smoothness={5} position={[0, spec.height / 2 + 0.28, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={spec.colour} metalness={0.36} roughness={0.32} />
      </RoundedBox>
      <mesh position={[0, spec.height + 0.18, 0]} castShadow>
        <boxGeometry args={[spec.length * 0.78, 0.065, spec.width * 0.92]} />
        <meshStandardMaterial color="#202a26" metalness={0.42} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.47, spec.width * 0.512]}>
        <boxGeometry args={[spec.length * 0.82, 0.045, 0.025]} />
        <meshStandardMaterial color={spec.accent} metalness={0.26} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.47, -spec.width * 0.512]}>
        <boxGeometry args={[spec.length * 0.82, 0.045, 0.025]} />
        <meshStandardMaterial color={spec.accent} metalness={0.26} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.58, spec.width * 0.516]}>
        <boxGeometry args={[spec.length * 0.77, 0.035, 0.025]} />
        <meshStandardMaterial color={type === "DANFO" ? "#17251d" : "#92a89a"} metalness={0.35} roughness={0.42} />
      </mesh>
      {type === "HIACE" && <RoundedBox args={[0.68, 0.55, spec.width * 0.94]} radius={0.12} smoothness={4} position={[spec.length * 0.38, 0.52, 0]} castShadow><meshStandardMaterial color={spec.colour} metalness={0.28} roughness={0.38} /></RoundedBox>}
      {type === "COASTER" && <mesh position={[0, spec.height + 0.235, 0]}><boxGeometry args={[spec.length * 0.66, 0.035, spec.width * 0.78]} /><meshStandardMaterial color="#d6ff3f" emissive="#a3e635" emissiveIntensity={0.08} /></mesh>}
      {type === "KOROPE" && <mesh position={[spec.length * 0.47, 0.36, 0]}><boxGeometry args={[0.22, 0.13, spec.width * 0.64]} /><meshStandardMaterial color="#202a26" metalness={0.45} roughness={0.4} /></mesh>}
      {Array.from({ length: spec.windows }).map((_, index) => {
        const x = windowStart + windowGap * (index + 0.52);
        const isDoor = type !== "DANFO" && index === Math.floor(spec.windows / 2);
        return (
          <group key={`window-${index}`}>
            {[-1, 1].map((side) => (
              <mesh key={`${index}-${side}`} position={[x, spec.height * 0.72 + 0.28, side * spec.width * 0.505]}>
                <boxGeometry args={[windowWidth * (isDoor ? 0.72 : 1), spec.height * 0.35, 0.028]} />
                <meshStandardMaterial color="#16313a" metalness={0.58} roughness={0.18} />
              </mesh>
            ))}
          </group>
        );
      })}
      <mesh position={[spec.length * 0.501, spec.height * 0.72 + 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[spec.width * 0.78, spec.height * 0.43]} />
        <meshStandardMaterial color="#15323b" metalness={0.58} roughness={0.17} />
      </mesh>
      <mesh position={[-spec.length * 0.501, spec.height * 0.72 + 0.28, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[spec.width * 0.68, spec.height * 0.4]} />
        <meshStandardMaterial color="#173039" metalness={0.48} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`light-${side}`}>
          <mesh position={[spec.length * 0.505, 0.48, side * spec.width * 0.32]}>
            <boxGeometry args={[0.035, 0.18, 0.16]} />
            <meshStandardMaterial color="#fff6d3" emissive="#fbbf24" emissiveIntensity={0.58} />
          </mesh>
          <mesh position={[-spec.length * 0.505, 0.46, side * spec.width * 0.34]}>
            <boxGeometry args={[0.035, 0.14, 0.13]} />
            <meshStandardMaterial color="#a53c31" emissive="#ef4444" emissiveIntensity={0.34} />
          </mesh>
          <group position={[spec.length * 0.35, 1.05, side * spec.width * 0.58]}>
            <mesh position={[0, 0.06, 0]} rotation={[0, 0, side * -0.25]}>
              <boxGeometry args={[0.3, 0.045, 0.06]} />
              <meshStandardMaterial color="#303a35" metalness={0.52} roughness={0.35} />
            </mesh>
            <mesh position={[0.13, -0.02, 0]}>
              <boxGeometry args={[0.07, 0.12, 0.09]} />
              <meshStandardMaterial color="#303a35" metalness={0.52} roughness={0.35} />
            </mesh>
          </group>
        </group>
      ))}
      <mesh position={[spec.length * 0.505, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.12, spec.width * 0.72]} />
        <meshStandardMaterial color="#202a26" metalness={0.46} roughness={0.38} />
      </mesh>
      {[-1, 1].map((side) => wheelXs.map((x) => <Wheel key={`${side}-${x}`} position={[x, 0.36, side * spec.width * 0.51]}/>))}
      {type === "DANFO" && (
        <mesh position={[spec.length * 0.45, 0.78, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[spec.width * 0.24, 0.15]} />
          <meshStandardMaterial color="#f6f7ee" roughness={0.64} />
        </mesh>
      )}
    </group>
  );
}

function Seat({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.43, 0.13, 0.43]} radius={0.055} smoothness={3} position={[0, 0.36, 0]}>
        <meshStandardMaterial color={accent} roughness={0.76} />
      </RoundedBox>
      <RoundedBox args={[0.43, 0.62, 0.12]} radius={0.055} smoothness={3} position={[0, 0.66, -0.16]} rotation={[-0.1, 0, 0]}>
        <meshStandardMaterial color={accent} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.26, 0.2, 0.09]} radius={0.035} smoothness={3} position={[0, 1.03, -0.17]}>
        <meshStandardMaterial color="#d6dfd7" roughness={0.7} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.14, 0.2, 0]}>
          <boxGeometry args={[0.035, 0.28, 0.035]} />
          <meshStandardMaterial color="#87958e" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function VehicleInterior({ type }: { type: VehicleTypeChoice }) {
  const spec = SPECS[type];
  const seatsPerRow = type === "COASTER" ? 3 : 2;
  const passengerRows = Math.max(2, Math.ceil(spec.capacity / seatsPerRow));
  const seatLocations: [number, number, number][] = [];
  for (let row = 0; row < passengerRows; row += 1) {
    const x = spec.length * 0.28 - row * (spec.length * 0.58 / Math.max(1, passengerRows - 1));
    if (seatsPerRow === 3) {
      seatLocations.push([x, 0, -spec.width * 0.29], [x, 0, 0], [x, 0, spec.width * 0.29]);
    } else {
      seatLocations.push([x, 0, -spec.width * 0.27], [x, 0, spec.width * 0.24]);
    }
  }
  const visibleSeats = seatLocations.slice(0, spec.capacity);
  const seatAccent = type === "DANFO" ? "#243c2e" : type === "COASTER" ? "#395a54" : "#344d47";

  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[spec.length * 0.9, 0.12, spec.width * 0.86]} />
        <meshStandardMaterial color="#9aa59e" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.96, side * spec.width * 0.42]}>
            <boxGeometry args={[spec.length * 0.88, 1.35, 0.07]} />
            <meshStandardMaterial color="#d6ded9" metalness={0.22} roughness={0.52} transparent opacity={0.38} />
          </mesh>
          {Array.from({ length: spec.windows }).map((_, index) => {
            const x = -spec.length * 0.37 + index * (spec.length * 0.74 / Math.max(1, spec.windows - 1));
            return (
              <mesh key={`${side}-${index}`} position={[x, 1.16, side * spec.width * 0.465]}>
                <boxGeometry args={[Math.max(0.28, spec.length / spec.windows * 0.68), 0.52, 0.035]} />
                <meshStandardMaterial color="#17343b" metalness={0.5} roughness={0.18} />
              </mesh>
            );
          })}
        </group>
      ))}
      <mesh position={[spec.length * 0.4, 0.7, 0]}>
        <boxGeometry args={[0.12, 1.22, spec.width * 0.84]} />
        <meshStandardMaterial color="#35443d" roughness={0.82} />
      </mesh>
      <mesh position={[spec.length * 0.28, 0.56, -spec.width * 0.22]}>
        <boxGeometry args={[0.58, 0.12, 0.45]} />
        <meshStandardMaterial color="#29332f" roughness={0.78} />
      </mesh>
      <Seat position={[spec.length * 0.3, 0, -spec.width * 0.22]} accent="#253a32" />
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[spec.length * 0.62, 0.035, 0.11]} />
        <meshStandardMaterial color="#48564f" roughness={0.94} />
      </mesh>
      {visibleSeats.map((position, index) => <Seat key={`seat-${index}`} position={position} accent={seatAccent} />)}
      <mesh position={[-spec.length * 0.47, 0.82, 0]}>
        <boxGeometry args={[0.09, 1.25, spec.width * 0.83]} />
        <meshStandardMaterial color="#5f6e66" roughness={0.85} />
      </mesh>
    </group>
  );
}

export function VehicleCatalogue3D({ value, onChange }: { value: VehicleTypeChoice; onChange: (value: VehicleTypeChoice) => void }) {
  const [view, setView] = useState<VehicleView>("exterior");
  const selected = VEHICLE_OPTIONS.find((option) => option.value === value) ?? VEHICLE_OPTIONS[1];
  return (
    <div className="qnot-vehicle-catalogue">
      <div className="qnot-vehicle-preview">
        <div className="qnot-vehicle-preview-heading">
          <span><i /> VEHICLE EXPLORER</span>
          <div className="qnot-vehicle-view-switch" role="group" aria-label="Vehicle view">
            <button type="button" className={view === "exterior" ? "is-active" : ""} onClick={() => setView("exterior")} aria-pressed={view === "exterior"}>Exterior</button>
            <button type="button" className={view === "interior" ? "is-active" : ""} onClick={() => setView("interior")} aria-pressed={view === "interior"}>Cabin</button>
          </div>
        </div>
        <div className="qnot-vehicle-canvas">
        <Canvas key={`${value}-${view}`} shadows={{ type: THREE.PCFShadowMap }} camera={{ position: view === "interior" ? [3.6, 2.5, 4.8] : [5.5, 3.3, 6.2], fov: view === "interior" ? 48 : 37 }} dpr={[1, 1.5]}>
          <color attach="background" args={["#0c1513"]} />
          <ambientLight intensity={1.15} />
          <directionalLight position={[4, 7, 5]} intensity={2.1} castShadow />
          <pointLight position={[-4, 3, -4]} intensity={0.7} />
          {view === "exterior" ? <VehicleExterior type={value} /> : <VehicleInterior type={value} />}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[18, 18]} />
            <meshStandardMaterial color="#111a17" roughness={0.94} />
          </mesh>
          <ContactShadows position={[0, 0.025, 0]} opacity={0.42} scale={10} blur={2.8} far={4} />
          <OrbitControls enablePan={false} minDistance={view === "interior" ? 2.6 : 4.2} maxDistance={view === "interior" ? 8 : 11} minPolarAngle={0.55} maxPolarAngle={1.48} target={view === "interior" ? [0, 0.55, 0] : [0, 0.55, 0]} />
        </Canvas>
        </div>
        <div className="qnot-vehicle-canvas-foot"><span>{view === "exterior" ? "ROTATE TO INSPECT THE BODY" : "LOOK AROUND THE SEATING LAYOUT"}</span><span>DRAG / ZOOM</span></div>
      </div>
      <div className="qnot-vehicle-details">
        <div>
          <p className="qnot-vehicle-overline">SELECT THE CLASS THAT MATCHES YOUR VEHICLE</p>
          <h3>{selected.label}</h3>
          <p>{selected.note} <span>·</span> Typical configuration: {selected.capacity} passenger seats</p>
        </div>
        <div className="qnot-vehicle-capacity"><strong>{selected.capacity}</strong><span>PASSENGER<br />SEATS / TYPICAL</span></div>
      </div>
      <div className="qnot-vehicle-options" role="group" aria-label="Choose vehicle class">
        {VEHICLE_OPTIONS.map((option, index) => (
          <button key={option.value} type="button" onClick={() => { onChange(option.value); setView("exterior"); }} className={`qnot-vehicle-option${value === option.value ? " is-active" : ""}`} aria-pressed={value === option.value}>
            <span className="qnot-vehicle-option-no">0{index + 1}</span>
            <span><strong>{option.label}</strong><small>{option.capacity} seats · {option.note}</small></span>
            <i>↗</i>
          </button>
        ))}
      </div>
      <p className="qnot-vehicle-note">These are class and layout previews. During registration, Q-not records the actual make, model, plate number and approved passenger capacity from your vehicle documents.</p>
    </div>
  );
}
