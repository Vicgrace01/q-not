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
  roofLength: number;
  roofWidth: number;
  wheelRadius: number;
};

const SPECS: Record<VehicleTypeChoice, VehicleSpec> = {
  DANFO: { length: 3.55, height: 1.42, width: 1.24, colour: "#e9b923", windows: 4, capacity: 14, accent: "#17271f", roofLength: 0.82, roofWidth: 0.9, wheelRadius: 0.31 },
  KOROPE: { length: 3.0, height: 1.35, width: 1.22, colour: "#cbd5d1", windows: 3, capacity: 11, accent: "#78958b", roofLength: 0.72, roofWidth: 0.88, wheelRadius: 0.29 },
  HIACE: { length: 4.15, height: 1.58, width: 1.35, colour: "#d8dfdc", windows: 5, capacity: 14, accent: "#344d51", roofLength: 0.86, roofWidth: 0.91, wheelRadius: 0.33 },
  COASTER: { length: 6.0, height: 1.9, width: 1.6, colour: "#d7dfda", windows: 7, capacity: 30, accent: "#36534a", roofLength: 0.94, roofWidth: 0.94, wheelRadius: 0.35 },
  SHUTTLE: { length: 4.8, height: 1.68, width: 1.48, colour: "#cbd5d1", windows: 6, capacity: 18, accent: "#8ba45c", roofLength: 0.9, roofWidth: 0.92, wheelRadius: 0.34 },
  OTHER: { length: 3.4, height: 1.4, width: 1.25, colour: "#aebbb6", windows: 3, capacity: 4, accent: "#526b61", roofLength: 0.78, roofWidth: 0.9, wheelRadius: 0.3 },
};

function Wheel({ position, side, radius }: { position: [number, number, number]; side: -1 | 1; radius: number }) {
  const lugPositions = Array.from({ length: 5 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 5;
    return [Math.cos(angle) * radius * 0.39, Math.sin(angle) * radius * 0.39] as const;
  });

  return (
    <group position={position}>
      {/* The axle runs across the vehicle: cylinder axis is Z, not X. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, 0.2, 32]} />
        <meshStandardMaterial color="#111715" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0, side * 0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.035, 28]} />
        <meshStandardMaterial color="#9eaea7" metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, side * 0.127]}>
        <torusGeometry args={[radius * 0.47, 0.018, 8, 28]} />
        <meshStandardMaterial color="#d4ded8" metalness={0.86} roughness={0.23} />
      </mesh>
      <mesh position={[0, 0, side * 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.2, radius * 0.2, 0.04, 20]} />
        <meshStandardMaterial color="#45564e" metalness={0.74} roughness={0.3} />
      </mesh>
      {lugPositions.map(([x, y], index) => (
        <mesh key={index} position={[x, y, side * 0.145]}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color="#edf2ef" metalness={0.8} roughness={0.24} />
        </mesh>
      ))}
    </group>
  );
}

function SideWindow({ x, y, z, width, height, side }: {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  side: -1 | 1;
}) {
  return (
    <group position={[x, y, z]}>
      <RoundedBox args={[width + 0.055, height + 0.055, 0.045]} radius={0.035} smoothness={3}>
        <meshStandardMaterial color="#263a3b" metalness={0.46} roughness={0.34} />
      </RoundedBox>
      <RoundedBox args={[width, height, 0.052]} radius={0.025} smoothness={3} position={[0, 0, side * 0.012]}>
        <meshPhysicalMaterial color="#15343d" metalness={0.48} roughness={0.16} clearcoat={0.9} clearcoatRoughness={0.12} />
      </RoundedBox>
      <mesh position={[0, 0, side * 0.045]}>
        <boxGeometry args={[0.018, height * 0.88, 0.008]} />
        <meshStandardMaterial color="#70827b" metalness={0.5} roughness={0.38} />
      </mesh>
    </group>
  );
}

function VehicleExterior({ type }: { type: VehicleTypeChoice }) {
  const spec = SPECS[type];
  const isBus = type === "COASTER";
  const isVan = type === "HIACE" || type === "SHUTTLE";
  const bodyY = spec.height / 2 + 0.28;
  const windowY = 0.28 + spec.height * (isBus ? 0.73 : 0.72);
  const windowHeight = spec.height * (isBus ? 0.36 : 0.34);
  const sideZ = spec.width * 0.515;
  const windowGap = (spec.length * 0.76) / spec.windows;
  const windowWidth = Math.min(windowGap * 0.77, type === "KOROPE" ? 0.62 : 0.78);
  const wheelXs = isBus
    ? [-spec.length * 0.38, -spec.length * 0.23, spec.length * 0.35]
    : [-spec.length * 0.32, spec.length * 0.34];

  return (
    <group position={[0, 0.08, 0]}>
      {/* Chassis and lower body */}
      <RoundedBox args={[spec.length * 0.94, 0.2, spec.width * 1.04]} radius={0.055} smoothness={3} position={[0, 0.18, 0]} castShadow>
        <meshStandardMaterial color="#18221e" metalness={0.3} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[spec.length, spec.height, spec.width]} radius={type === "SHUTTLE" ? 0.2 : 0.12} smoothness={5} position={[0, bodyY, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={spec.colour} metalness={0.3} roughness={0.34} />
      </RoundedBox>
      {/* Roof profile varies by vehicle class. */}
      <RoundedBox
        args={[spec.length * spec.roofLength, 0.16, spec.width * spec.roofWidth]}
        radius={type === "SHUTTLE" || type === "HIACE" ? 0.13 : 0.07}
        smoothness={4}
        position={[type === "KOROPE" ? -spec.length * 0.045 : 0, 0.28 + spec.height + 0.045, 0]}
        castShadow
      >
        <meshStandardMaterial color={type === "DANFO" ? "#d5a81e" : spec.colour} metalness={0.24} roughness={0.42} />
      </RoundedBox>

      {/* Class-specific body cues */}
      {type === "DANFO" && (
        <>
          <RoundedBox args={[spec.length * 0.28, 0.22, spec.width * 0.94]} radius={0.06} smoothness={3} position={[spec.length * 0.36, 0.56, 0]}>
            <meshStandardMaterial color="#202a24" roughness={0.48} />
          </RoundedBox>
          <RoundedBox args={[0.72, 0.13, 0.3]} radius={0.045} smoothness={3} position={[-0.08, spec.height + 0.53, 0]}>
            <meshStandardMaterial color="#18241e" metalness={0.34} roughness={0.38} />
          </RoundedBox>
          <mesh position={[0, 0.53, sideZ * 1.012]}>
            <boxGeometry args={[spec.length * 0.9, 0.085, 0.018]} />
            <meshStandardMaterial color="#202a23" roughness={0.45} />
          </mesh>
        </>
      )}
      {type === "KOROPE" && (
        <>
          <RoundedBox args={[spec.length * 0.28, 0.3, spec.width * 0.9]} radius={0.09} smoothness={4} position={[spec.length * 0.37, 0.46, 0]}>
            <meshStandardMaterial color="#b8c5bf" metalness={0.3} roughness={0.38} />
          </RoundedBox>
          <mesh position={[0, 0.49, sideZ * 1.02]}>
            <boxGeometry args={[spec.length * 0.82, 0.055, 0.022]} />
            <meshStandardMaterial color="#78958b" metalness={0.32} roughness={0.4} />
          </mesh>
        </>
      )}
      {type === "HIACE" && (
        <>
          <RoundedBox args={[spec.length * 0.24, 0.3, spec.width * 0.96]} radius={0.1} smoothness={4} position={[spec.length * 0.39, 0.48, 0]}>
            <meshStandardMaterial color="#d1dad6" metalness={0.28} roughness={0.35} />
          </RoundedBox>
          <mesh position={[-spec.length * 0.02, 0.55, sideZ * 1.02]}>
            <boxGeometry args={[spec.length * 0.86, 0.035, 0.02]} />
            <meshStandardMaterial color="#526b68" metalness={0.38} roughness={0.35} />
          </mesh>
        </>
      )}
      {type === "COASTER" && (
        <>
          <RoundedBox args={[spec.length * 0.68, 0.17, spec.width * 0.8]} radius={0.045} smoothness={3} position={[-spec.length * 0.02, spec.height + 0.34, 0]}>
            <meshStandardMaterial color="#263c37" metalness={0.35} roughness={0.34} />
          </RoundedBox>
          <mesh position={[0, 0.5, sideZ * 1.018]}>
            <boxGeometry args={[spec.length * 0.94, 0.095, 0.022]} />
            <meshStandardMaterial color="#527d6c" metalness={0.3} roughness={0.42} />
          </mesh>
        </>
      )}
      {type === "SHUTTLE" && (
        <>
          <RoundedBox args={[spec.length * 0.88, 0.32, spec.width * 1.012]} radius={0.1} smoothness={4} position={[0, 0.46, 0]}>
            <meshStandardMaterial color="#aab8b1" metalness={0.28} roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.65, sideZ * 1.02]}>
            <boxGeometry args={[spec.length * 0.84, 0.055, 0.022]} />
            <meshStandardMaterial color="#8ba45c" metalness={0.24} roughness={0.42} />
          </mesh>
        </>
      )}
      {type === "OTHER" && (
        <>
          <RoundedBox args={[spec.length * 0.34, 0.24, spec.width * 0.92]} radius={0.05} smoothness={3} position={[-spec.length * 0.3, spec.height + 0.13, 0]}>
            <meshStandardMaterial color="#63786e" metalness={0.24} roughness={0.5} />
          </RoundedBox>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[-spec.length * 0.29, spec.height + 0.27, side * spec.width * 0.35]}>
              <boxGeometry args={[spec.length * 0.27, 0.035, 0.045]} />
              <meshStandardMaterial color="#34483f" metalness={0.45} roughness={0.4} />
            </mesh>
          ))}
        </>
      )}

      {/* Side glass, door seams, handles and livery */}
      {([-1, 1] as const).map((side) => (
        <group key={`side-${side}`}>
          {Array.from({ length: spec.windows }).map((_, index) => {
            const x = -spec.length * 0.38 + windowGap * (index + 0.5);
            const isDoorWindow = (type === "HIACE" || type === "SHUTTLE") && index === Math.floor(spec.windows / 2);
            return (
              <SideWindow
                key={`window-${index}`}
                x={x}
                y={windowY}
                z={side * sideZ}
                width={windowWidth * (isDoorWindow ? 0.82 : 1)}
                height={windowHeight}
                side={side}
              />
            );
          })}
          <mesh position={[0, 0.47, side * spec.width * 0.526]}>
            <boxGeometry args={[spec.length * 0.84, type === "DANFO" ? 0.045 : 0.06, 0.025]} />
            <meshStandardMaterial color={spec.accent} metalness={0.28} roughness={0.42} />
          </mesh>
          {(isVan || type === "DANFO") && (
            <>
              <mesh position={[-spec.length * 0.02, 0.88, side * spec.width * 0.525]}>
                <boxGeometry args={[0.018, 0.7, 0.012]} />
                <meshStandardMaterial color="#58645e" metalness={0.36} roughness={0.48} />
              </mesh>
              <RoundedBox args={[0.13, 0.028, 0.035]} radius={0.012} smoothness={2} position={[-spec.length * 0.11, 0.78, side * spec.width * 0.55]}>
                <meshStandardMaterial color="#3c4943" metalness={0.62} roughness={0.3} />
              </RoundedBox>
            </>
          )}
          {/* Side mirror assembly */}
          <mesh position={[spec.length * 0.34, windowY - 0.16, side * spec.width * 0.57]}>
            <boxGeometry args={[0.16, 0.035, 0.12]} />
            <meshStandardMaterial color="#34423c" metalness={0.5} roughness={0.36} />
          </mesh>
          <RoundedBox args={[0.14, 0.19, 0.085]} radius={0.035} smoothness={3} position={[spec.length * 0.36, windowY - 0.22, side * spec.width * 0.61]}>
            <meshStandardMaterial color="#26332e" metalness={0.42} roughness={0.34} />
          </RoundedBox>
          <mesh position={[0, 0.34, side * spec.width * 0.52]}>
            <boxGeometry args={[spec.length * 0.86, 0.04, 0.025]} />
            <meshStandardMaterial color={type === "DANFO" ? "#1b2b22" : spec.accent} metalness={0.24} roughness={0.48} />
          </mesh>
        </group>
      ))}

      {/* Front and rear glass */}
      <RoundedBox args={[spec.width * (isBus ? 0.82 : 0.78), spec.height * (isBus ? 0.4 : 0.39), 0.045]} radius={0.055} smoothness={4} position={[spec.length * 0.501, windowY, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshPhysicalMaterial color="#15343d" metalness={0.46} roughness={0.16} clearcoat={0.9} />
      </RoundedBox>
      <RoundedBox args={[spec.width * 0.7, spec.height * 0.34, 0.04]} radius={0.04} smoothness={3} position={[-spec.length * 0.501, windowY, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <meshPhysicalMaterial color="#18333b" metalness={0.4} roughness={0.2} />
      </RoundedBox>

      {/* Front fascia, grille, lights and bumpers */}
      <RoundedBox args={[0.075, 0.23, spec.width * 0.42]} radius={0.025} smoothness={3} position={[spec.length * 0.505, 0.48, 0]}>
        <meshStandardMaterial color="#202b27" metalness={0.45} roughness={0.38} />
      </RoundedBox>
      {([-1, 1] as const).map((side) => (
        <group key={`front-light-${side}`}>
          <RoundedBox args={[0.06, 0.14, 0.19]} radius={0.035} smoothness={3} position={[spec.length * 0.512, 0.57, side * spec.width * 0.34]}>
            <meshStandardMaterial color="#fff3cb" emissive="#f5df9a" emissiveIntensity={0.42} roughness={0.24} />
          </RoundedBox>
          <mesh position={[-spec.length * 0.505, 0.5, side * spec.width * 0.38]}>
            <boxGeometry args={[0.045, 0.16, 0.11]} />
            <meshStandardMaterial color="#a54237" emissive="#d74436" emissiveIntensity={0.22} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.13, 0.12, spec.width * 0.78]} radius={0.035} smoothness={3} position={[spec.length * 0.51, 0.25, 0]}>
        <meshStandardMaterial color="#29342f" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.12, spec.width * 0.75]} radius={0.03} smoothness={3} position={[-spec.length * 0.51, 0.25, 0]}>
        <meshStandardMaterial color="#29342f" metalness={0.42} roughness={0.45} />
      </RoundedBox>

      {/* Wheel arches and correctly oriented wheels */}
      {([-1, 1] as const).map((side) => (
        <group key={`wheels-${side}`}>
          {wheelXs.map((x) => (
            <group key={`arch-${x}`}>
              <mesh position={[x, 0.36, side * spec.width * 0.515]}>
                <torusGeometry args={[spec.wheelRadius * 1.06, 0.035, 8, 28, Math.PI]} />
                <meshStandardMaterial color="#27332e" roughness={0.72} />
              </mesh>
              <Wheel position={[x, 0.36, side * spec.width * 0.54]} side={side} radius={spec.wheelRadius} />
            </group>
          ))}
        </group>
      ))}

      {/* Roof equipment and class markers */}
      {(type === "HIACE" || type === "OTHER") && ([-1, 1] as const).map((side) => (
        <mesh key={`rail-${side}`} position={[0, spec.height + 0.19, side * spec.width * 0.34]}>
          <boxGeometry args={[spec.length * 0.62, 0.035, 0.045]} />
          <meshStandardMaterial color="#54645d" metalness={0.62} roughness={0.32} />
        </mesh>
      ))}
      {type === "COASTER" && (
        <mesh position={[spec.length * 0.505, windowY + 0.33, 0]}>
          <boxGeometry args={[0.035, 0.13, spec.width * 0.42]} />
          <meshStandardMaterial color="#d9f26a" emissive="#a3e635" emissiveIntensity={0.14} />
        </mesh>
      )}
    </group>
  );
}

function Seat({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    // Seat backs sit behind the passenger; rotating the seat makes it face the +X front of the vehicle.
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <RoundedBox args={[0.43, 0.13, 0.43]} radius={0.055} smoothness={3} position={[0, 0.36, 0]}>
        <meshStandardMaterial color={accent} roughness={0.76} />
      </RoundedBox>
      <RoundedBox args={[0.43, 0.62, 0.12]} radius={0.055} smoothness={3} position={[0, 0.66, -0.16]} rotation={[-0.1, 0, 0]}>
        <meshStandardMaterial color={accent} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.26, 0.2, 0.09]} radius={0.035} smoothness={3} position={[0, 1.03, -0.17]}>
        <meshStandardMaterial color="#d6dfd7" roughness={0.7} />
      </RoundedBox>
      {([-1, 1] as const).map((side) => (
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
    const x = spec.length * 0.18 - row * (spec.length * 0.5 / Math.max(1, passengerRows - 1));
    if (seatsPerRow === 3) {
      seatLocations.push([x, 0, -spec.width * 0.31], [x, 0, 0], [x, 0, spec.width * 0.31]);
    } else {
      seatLocations.push([x, 0, -spec.width * 0.25], [x, 0, spec.width * 0.25]);
    }
  }
  const visibleSeats = seatLocations.slice(0, spec.capacity);
  const seatAccent = type === "DANFO" ? "#243c2e" : type === "COASTER" ? "#395a54" : "#344d47";
  const railColour = "#a6b5ad";

  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[spec.length * 0.9, 0.12, spec.width * 0.86]} />
        <meshStandardMaterial color="#9aa59e" roughness={0.9} />
      </mesh>
      {/* Interior side panels and glazing */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[0, 0.96, side * spec.width * 0.42]}>
            <boxGeometry args={[spec.length * 0.88, 1.35, 0.07]} />
            <meshStandardMaterial color="#d6ded9" metalness={0.22} roughness={0.52} transparent opacity={0.34} />
          </mesh>
          {Array.from({ length: spec.windows }).map((_, index) => {
            const x = -spec.length * 0.37 + index * (spec.length * 0.74 / Math.max(1, spec.windows - 1));
            return (
              <mesh key={`${side}-${index}`} position={[x, 1.16, side * spec.width * 0.465]}>
                <boxGeometry args={[Math.max(0.28, spec.length / spec.windows * 0.68), 0.52, 0.035]} />
                <meshPhysicalMaterial color="#17343b" metalness={0.5} roughness={0.18} clearcoat={0.75} />
              </mesh>
            );
          })}
          <mesh position={[0, 1.63, side * spec.width * 0.36]}>
            <boxGeometry args={[spec.length * 0.72, 0.045, 0.045]} />
            <meshStandardMaterial color={railColour} metalness={0.72} roughness={0.28} />
          </mesh>
          {Array.from({ length: Math.max(3, Math.floor(spec.length / 0.8)) }).map((_, index) => {
            const x = -spec.length * 0.35 + index * (spec.length * 0.7 / Math.max(1, Math.floor(spec.length / 0.8) - 1));
            return (
              <mesh key={`pole-${index}`} position={[x, 1.1, side * spec.width * 0.36]}>
                <cylinderGeometry args={[0.018, 0.018, 1.0, 10]} />
                <meshStandardMaterial color={railColour} metalness={0.7} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* Driver cockpit at the +X front */}
      <mesh position={[spec.length * 0.39, 0.65, -spec.width * 0.22]}>
        <boxGeometry args={[0.12, 1.15, spec.width * 0.82]} />
        <meshStandardMaterial color="#35443d" roughness={0.82} />
      </mesh>
      <mesh position={[spec.length * 0.29, 0.72, -spec.width * 0.22]}>
        <boxGeometry args={[0.52, 0.1, 0.48]} />
        <meshStandardMaterial color="#29332f" roughness={0.72} />
      </mesh>
      <mesh position={[spec.length * 0.31, 0.94, -spec.width * 0.22]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.19, 0.025, 8, 24]} />
        <meshStandardMaterial color="#202a26" metalness={0.56} roughness={0.34} />
      </mesh>
      <mesh position={[spec.length * 0.31, 0.94, -spec.width * 0.22]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.22, 12]} />
        <meshStandardMaterial color="#7d8b84" metalness={0.64} roughness={0.32} />
      </mesh>
      <Seat position={[spec.length * 0.31, 0, -spec.width * 0.22]} accent="#253a32" />
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
          <Canvas
            key={`${value}-${view}`}
            shadows={{ type: THREE.PCFShadowMap }}
            camera={{ position: view === "interior" ? [3.6, 2.5, 4.8] : [5.5, 3.3, 6.2], fov: view === "interior" ? 48 : 37 }}
            dpr={[1, 1.5]}
          >
            <color attach="background" args={["#0c1513"]} />
            <ambientLight intensity={1.1} />
            <directionalLight position={[4, 7, 5]} intensity={2.0} castShadow />
            <directionalLight position={[-4, 3, -4]} intensity={0.55} />
            {view === "exterior" ? <VehicleExterior type={value} /> : <VehicleInterior type={value} />}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[18, 18]} />
              <meshStandardMaterial color="#111a17" roughness={0.94} />
            </mesh>
            <ContactShadows position={[0, 0.025, 0]} opacity={0.42} scale={10} blur={2.8} far={4} />
            <OrbitControls
              enablePan={false}
              minDistance={view === "interior" ? 2.6 : 4.2}
              maxDistance={view === "interior" ? 8 : 11}
              minPolarAngle={0.55}
              maxPolarAngle={1.48}
              target={view === "interior" ? [0, 0.55, 0] : [0, 0.55, 0]}
            />
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
          <button
            key={option.value}
            type="button"
            onClick={() => { onChange(option.value); setView("exterior"); }}
            className={`qnot-vehicle-option${value === option.value ? " is-active" : ""}`}
            aria-pressed={value === option.value}
          >
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
