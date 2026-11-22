"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VehicleTypeChoice } from "@/components/vehicle-catalogue-3d";

type CampusPoint = { id: string; name: string; latitude: number; longitude: number; note?: string };
type DemoRole = "passenger" | "driver" | "operator";
type DemoStage = "none" | "reserved" | "boarded" | "arrived";
type PassengerPosition = { latitude: number; longitude: number; source: "device" | "simulated" };

const CAMPUS_CENTRE: [number, number] = [6.86509, 7.40842];

// Candidate landmarks for a clickable demo. These are reference coordinates,
// not surveyed transport bays or approved vehicle routes.
const CAMPUS_POINTS: CampusPoint[] = [
  { id: "odim", name: "Odim Gate", latitude: 6.87389, longitude: 7.40911, note: "Candidate point from a place listing; verify the gate entrance and safe waiting bay." },
  { id: "engineering", name: "Faculty of Engineering · Civil Engineering", latitude: 6.86699, longitude: 7.4095, note: "Approximate faculty/building reference." },
  { id: "pharmacy", name: "Faculty of Pharmaceutical Sciences", latitude: 6.8631, longitude: 7.4109, note: "Approximate building reference; verify the exact entrance." },
  { id: "hilltop", name: "Hilltop Gate", latitude: 6.857667, longitude: 7.411256, note: "Approximate Hilltop Gate pin; verify the exact entrance and safe waiting bay." },
  { id: "education", name: "Faculty of Education", latitude: 6.86012, longitude: 7.40787, note: "Approximate faculty reference." },
  { id: "unn-centre", name: "UNN Campus Centre", latitude: CAMPUS_CENTRE[0], longitude: CAMPUS_CENTRE[1], note: "Campus reference point, not a boarding stop." },
];

const ROUTE_PRESETS = [
  { id: "odim-engineering", label: "Odim Gate → Engineering", pickup: "odim", destination: "engineering", duration: "simulated 6–9 min" },
  { id: "odim-pharmacy", label: "Odim Gate → Pharmacy", pickup: "odim", destination: "pharmacy", duration: "simulated 8–12 min" },
  { id: "hilltop-education", label: "Hilltop Gate → Faculty of Education", pickup: "hilltop", destination: "education", duration: "simulated 5–8 min" },
] as const;

const FACULTIES: Record<string, string[]> = {
  "Faculty of Agriculture": ["Agricultural Economics", "Agricultural Extension", "Animal Science", "Soil Science", "Nutrition and Dietetics", "Home Science and Management", "Food Science and Technology", "Crop Science"],
  "Faculty of Arts": ["History and International Studies", "Mass Communication", "Archaeology and Tourism", "English and Literary Studies", "Fine and Applied Arts", "Linguistics, Igbo and Other Nigerian Languages", "Music", "Theatre and Film Studies", "Foreign Language and Literature"],
  "Faculty of Basic Medical Sciences": ["Not listed in the central directory — type destination or pin building"],
  "Faculty of Biological Sciences": ["Biochemistry", "Microbiology", "Plant Science and Biotechnology", "Genetics and Biotechnology", "Zoology and Environmental Biology"],
  "Faculty of Business Administration": ["Accountancy", "Marketing", "Banking and Finance", "Management"],
  "Faculty of Dentistry": ["Not listed in the central directory — type destination or pin building"],
  "Faculty of Education": ["Adult Education", "Arts Education", "Computer Education", "Educational Foundations", "Library Science", "Human Kinetics and Health Education", "Science Education", "Social Science"],
  "Faculty of Engineering": ["Agricultural and Bioresources Engineering", "Civil Engineering", "Electrical Engineering", "Electronic Engineering", "Mechanical Engineering", "Metallurgical and Materials Engineering", "Mechatronic Engineering", "Biomedical Engineering"],
  "Faculty of Environmental Studies": ["Estate Management", "Architecture", "Urban and Regional Planning", "Geoinformatics and Surveying"],
  "Faculty of Health Sciences": ["Not listed in the central directory — type destination or pin building"],
  "Faculty of Law": ["International and Comparative Law", "Commercial and Corporate Law", "Customary and Indigenous Law", "Jurisprudence and Legal Theory", "Property Law", "Public Law", "Private Law"],
  "Faculty of Medicine": ["Not listed in the central directory — type destination or pin building"],
  "Faculty of Pharmaceutical Sciences": ["Pharmaceutical and Medicinal Chemistry", "Pharmacology and Toxicology", "Pharmaceutics", "Pharmaceutical Technology and Industrial Pharmacy", "Pharmacognosy and Environmental Medicines", "Clinical Pharmacy and Pharmacy Management", "Pharmaceutical Microbiology and Biotechnology"],
  "Faculty of Social Sciences": ["Public Administration and Local Government", "Economics", "Political Science", "Social Work", "Religion and Cultural Studies", "Psychology", "Philosophy", "Geography", "Sociology and Anthropology"],
  "Faculty of Physical Sciences": ["Pure and Industrial Chemistry", "Computer Science", "Geology", "Mathematics", "Physics and Astronomy", "Science Laboratory Technology", "Statistics"],
  "Faculty of Veterinary Medicine": ["Veterinary Pathology and Microbiology", "Veterinary Obstetrics and Reproductive Diseases", "Veterinary Physiology and Pharmacology", "Veterinary Anatomy", "Veterinary Medicine", "Veterinary Animal Health and Production", "Veterinary Parasitology and Entomology", "Veterinary Public Health and Preventive Medicine", "Veterinary Surgery", "Veterinary Teaching Hospital"],
  "Faculty of Vocational Technical Education": ["Agricultural Education", "Business Education", "Computer Education", "Industrial Technical Education", "Home Economics and Hospitality Management Education"],
};

const DEMO_PEOPLE = ["Chika Nwosu", "Emeka Okafor", "Adaobi Eze", "Somto Nwankwo"];
const DEMO_DRIVERS = ["Kene Okafor", "Muna Eze", "Chinedu Obi"];
const DEMO_SLOTS = ["07:00", "07:20", "07:40", "08:00", "08:20", "08:40", "09:00", "09:20", "09:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "12:20", "12:40", "13:00", "13:20", "13:40", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40", "16:00", "16:20", "16:40", "17:00", "17:20", "17:40", "18:00"];

const VEHICLES: Array<{ value: VehicleTypeChoice; label: string; capacity: number; fare: number; seats: number[]; description: string }> = [
  { value: "ELECTRIC_TRICYCLE", label: "Electric Keke", capacity: 3, fare: 150, seats: [3], description: "3 demo seat positions · verify the approved passenger capacity" },
  { value: "KOROPE", label: "Korope", capacity: 11, fare: 250, seats: [2, 8], description: "11 demo seat positions · confirm actual vehicle capacity" },
  { value: "DANFO", label: "Danfo", capacity: 14, fare: 300, seats: [2, 9], description: "14 demo seat positions · confirm actual vehicle capacity" },
  { value: "HIACE", label: "Hiace / Van", capacity: 14, fare: 400, seats: [2, 9], description: "14 demo seat positions · confirm actual vehicle capacity" },
  { value: "SHUTTLE", label: "Campus Shuttle", capacity: 18, fare: 350, seats: [2, 7, 15], description: "18 demo seat positions · confirm actual vehicle capacity" },
  { value: "COASTER", label: "Coaster Bus", capacity: 30, fare: 500, seats: [2, 7, 15, 24], description: "30 demo seat positions · confirm actual vehicle capacity" },
  { value: "OTHER", label: "Other vehicle", capacity: 4, fare: 200, seats: [4], description: "Generic demo vehicle · 4 demo seats" },
];

const VehicleCatalogue3D = dynamic(
  () => import("@/components/vehicle-catalogue-3d").then((module) => module.VehicleCatalogue3D),
  { ssr: false, loading: () => <div className="flex h-[260px] items-center justify-center rounded-xl border border-neutral-800 bg-[#091711] text-sm text-neutral-400">Loading 3D vehicle preview…</div> },
);

type MapProps = {
  pickup: CampusPoint;
  destination: CampusPoint | null;
  vehiclePosition: CampusPoint | null;
  passengerPosition: PassengerPosition | null;
  mapPickMode: "pickup" | "destination" | null;
  onMapPoint: (point: CampusPoint) => void;
};

function CampusDemoMap({ pickup, destination, vehiclePosition, passengerPosition, mapPickMode, onMapPoint }: MapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onMapPointRef = useRef(onMapPoint);
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { onMapPointRef.current = onMapPoint; }, [onMapPoint]);

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | undefined;
    void import("leaflet").then((L) => {
      if (cancelled || !elementRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(elementRef.current, { scrollWheelZoom: false, zoomControl: true }).setView(CAMPUS_CENTRE, 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>",
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      map.on("click", (event) => {
        const lat = Number(event.latlng.lat.toFixed(6));
        const lng = Number(event.latlng.lng.toFixed(6));
        onMapPointRef.current({ id: `pin-${Date.now()}`, name: "Pinned campus point", latitude: lat, longitude: lng, note: "Demo pin selected by the tester; verify before real operations." });
      });
      mapRef.current = map;
      layerRef.current = layer;
      setMapReady(true);
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);
    }).catch((error: unknown) => console.error("Campus demo map could not start:", error));
    return () => {
      cancelled = true;
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!destination) return;
    const controller = new AbortController();
    const fallback: [number, number][] = [[pickup.latitude, pickup.longitude], [destination.latitude, destination.longitude]];
    const coordinates = `${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}`;
    void fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { code?: string; routes?: Array<{ geometry?: { coordinates?: [number, number][] } }> } : null)
      .then((payload) => {
        const points = payload?.routes?.[0]?.geometry?.coordinates;
        if (!controller.signal.aborted && payload?.code === "Ok" && points && points.length > 1) {
          setRoadPath(points.map(([lng, lat]) => [lat, lng] as [number, number]));
        } else if (!controller.signal.aborted) setRoadPath(fallback);
      })
      .catch(() => { if (!controller.signal.aborted) setRoadPath(fallback); });
    return () => controller.abort();
  }, [pickup, destination]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    if (destination && roadPath.length > 1) L.polyline(roadPath, { color: "#a3e635", weight: 5, opacity: 0.88, lineCap: "round", lineJoin: "round" }).addTo(layer);
    const add = (point: CampusPoint, colour: string, radius: number, label: string) => {
      L.circleMarker([point.latitude, point.longitude], { radius, color: "#f8fafc", weight: 2, fillColor: colour, fillOpacity: 0.96 })
        .bindTooltip(label, { direction: "top" }).addTo(layer);
    };
    add(pickup, "#22c55e", 9, `Pickup · ${pickup.name}`);
    if (destination) add(destination, "#fb7185", 9, `Destination · ${destination.name}`);
    if (vehiclePosition) add(vehiclePosition, "#c7f36b", 8, `Demo vehicle · ${vehiclePosition.name}`);
    if (passengerPosition) add({ id: "passenger", name: "Passenger device", latitude: passengerPosition.latitude, longitude: passengerPosition.longitude }, "#38bdf8", 7, passengerPosition.source === "device" ? "Passenger GPS (device)" : "Passenger simulated GPS");
    if (destination && roadPath.length > 1) {
      const bounds = L.latLngBounds(roadPath);
      map.fitBounds(bounds.pad(0.22), { maxZoom: 16 });
    } else map.setView([pickup.latitude, pickup.longitude], 16);
  }, [pickup, destination, vehiclePosition, passengerPosition, roadPath, mapReady]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-700 bg-[#0b1712]">
      <div ref={elementRef} className="h-[340px] w-full sm:h-[430px]" role="region" aria-label="Interactive University of Nigeria Nsukka campus demo map" />
      {mapPickMode && <div className="absolute left-3 top-3 z-[500] rounded-lg border border-lime-300/30 bg-[#071311]/95 px-3 py-2 text-xs font-semibold text-lime-100 shadow-lg">Tap the map to set {mapPickMode === "pickup" ? "your pickup" : "your destination"}</div>}
      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2 text-[10px] font-semibold">
        <span className="rounded-full bg-[#071311]/90 px-2.5 py-1 text-emerald-200">● Pickup</span>
        <span className="rounded-full bg-[#071311]/90 px-2.5 py-1 text-rose-200">● Destination</span>
        <span className="rounded-full bg-[#071311]/90 px-2.5 py-1 text-sky-200">● Passenger</span>
        <span className="rounded-full bg-[#071311]/90 px-2.5 py-1 text-lime-200">● Demo vehicle</span>
      </div>
    </div>
  );
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function demoCode() {
  return `QN-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function CampusDemoExperience() {
  const [role, setRole] = useState<DemoRole>("passenger");
  const [studentType, setStudentType] = useState<"student" | "visitor">("student");
  const [passengerName, setPassengerName] = useState(DEMO_PEOPLE[0]);
  const [driverName, setDriverName] = useState(DEMO_DRIVERS[0]);
  const [faculty, setFaculty] = useState("Faculty of Engineering");
  const [department, setDepartment] = useState("Civil Engineering");
  const [pickup, setPickup] = useState<CampusPoint>(CAMPUS_POINTS[0]);
  const [destination, setDestination] = useState<CampusPoint | null>(CAMPUS_POINTS[1]);
  const [destinationText, setDestinationText] = useState(CAMPUS_POINTS[1].name);
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTE_PRESETS[0].id);
  const [departure, setDeparture] = useState("08:00");
  const [vehicleType, setVehicleType] = useState<VehicleTypeChoice>("ELECTRIC_TRICYCLE");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([1]);
  const [demoBalance, setDemoBalance] = useState(5000);
  const [bookingStage, setBookingStage] = useState<DemoStage>("none");
  const [ticketCode, setTicketCode] = useState("");
  const [mapPickMode, setMapPickMode] = useState<"pickup" | "destination" | null>(null);
  const [passengerPosition, setPassengerPosition] = useState<PassengerPosition | null>(null);
  const [gpsMessage, setGpsMessage] = useState("Passenger location is off. Enable device GPS or use a simulated test position.");
  const [driverSharing, setDriverSharing] = useState(false);
  const [driverAtPickup, setDriverAtPickup] = useState(false);
  const [driverAtDestination, setDriverAtDestination] = useState(false);
  const [notice, setNotice] = useState("");
  const [demoCompleted, setDemoCompleted] = useState(false);
  const gpsWatchRef = useRef<number | null>(null);

  const vehicle = VEHICLES.find((item) => item.value === vehicleType) ?? VEHICLES[0];
  const departments = FACULTIES[faculty] ?? [];
  const fare = vehicle.fare * Math.max(1, selectedSeats.length);
  const passengerDistance = passengerPosition ? Math.round(distanceMeters(passengerPosition, pickup)) : null;
  const vehiclePosition: CampusPoint | null = !driverSharing ? null : driverAtDestination && destination ? destination : driverAtPickup ? pickup : {
    id: "demo-vehicle-approach", name: `${driverName}'s demo vehicle approaching`, latitude: pickup.latitude + 0.0018, longitude: pickup.longitude - 0.0012,
    note: "Simulated driver position, not a live vehicle." ,
  };
  const vehicleDistance = vehiclePosition ? Math.round(distanceMeters(vehiclePosition, pickup)) : null;
  const passengerAtPickup = passengerDistance !== null && passengerDistance <= 75;
  const vehicleAtPickup = vehicleDistance !== null && vehicleDistance <= 75 && !driverAtDestination;
  const currentRoute = destination ? `${pickup.name} → ${destination.name}` : `${pickup.name} → ${destinationText || "Custom destination"}`;

  const setDestinationPoint = useCallback((point: CampusPoint) => {
    setDestination(point);
    setDestinationText(point.name);
    setSelectedRoute("");
  }, []);

  const choosePreset = (routeId: string) => {
    const route = ROUTE_PRESETS.find((item) => item.id === routeId);
    if (!route) return;
    const nextPickup = CAMPUS_POINTS.find((point) => point.id === route.pickup) ?? CAMPUS_POINTS[0];
    const nextDestination = CAMPUS_POINTS.find((point) => point.id === route.destination) ?? CAMPUS_POINTS[1];
    setPickup(nextPickup);
    setDestination(nextDestination);
    setDestinationText(nextDestination.name);
    setSelectedRoute(routeId);
    setNotice("");
  };

  const chooseDepartment = (nextFaculty: string, nextDepartment: string) => {
    setFaculty(nextFaculty);
    setDepartment(nextDepartment);
    const mappedId = nextFaculty === "Faculty of Engineering" ? "engineering"
      : nextFaculty === "Faculty of Education" ? "education"
      : nextFaculty === "Faculty of Pharmaceutical Sciences" ? "pharmacy" : null;
    if (mappedId) {
      const mapped = CAMPUS_POINTS.find((point) => point.id === mappedId);
      if (mapped) setDestinationPoint({ ...mapped, name: `${nextDepartment} · ${nextFaculty}` });
    } else {
      setDestination(null);
      setDestinationText(`${nextDepartment} · ${nextFaculty}`);
      setSelectedRoute("");
    }
  };

  const onMapPoint = (point: CampusPoint) => {
    if (!mapPickMode) return;
    if (mapPickMode === "pickup") setPickup(point);
    else setDestinationPoint(point);
    setMapPickMode(null);
    setNotice(`${mapPickMode === "pickup" ? "Pickup" : "Destination"} pin selected. This is a demo coordinate, not a surveyed stop.`);
  };

  const startDeviceGps = () => {
    if (!navigator.geolocation) { setGpsMessage("This browser does not provide GPS location."); return; }
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
      setPassengerPosition(null);
      setGpsMessage("Passenger GPS stopped.");
      return;
    }
    setGpsMessage("Requesting permission for passenger GPS…");
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPassengerPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude, source: "device" });
        setGpsMessage(`Device GPS active · accuracy about ${Math.round(position.coords.accuracy)} m. Location stays in this demo page and is not sent to Q-not servers.`);
      },
      (error) => setGpsMessage(error.code === error.PERMISSION_DENIED ? "Location permission was denied. You can still use the simulated passenger position." : "Could not read GPS. Check device location settings or use simulation."),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  };

  useEffect(() => () => {
    if (gpsWatchRef.current !== null) navigator.geolocation?.clearWatch(gpsWatchRef.current);
  }, []);

  const setSimulatedPassengerAtPickup = () => {
    setPassengerPosition({ latitude: pickup.latitude + 0.00012, longitude: pickup.longitude + 0.00008, source: "simulated" });
    setGpsMessage("Simulated passenger phone is about 15 m from the pickup point. This is test data, not device GPS.");
  };

  const toggleSeat = (seatNumber: number) => {
    if (vehicle.seats.includes(seatNumber)) return;
    setSelectedSeats((current) => current.includes(seatNumber) ? current.filter((seat) => seat !== seatNumber) : current.length < 4 ? [...current, seatNumber].sort((a, b) => a - b) : current);
  };

  const reserveDemoRide = () => {
    if (!destination && !destinationText.trim()) { setNotice("Choose or type a destination first."); return; }
    if (selectedSeats.length === 0) { setNotice("Select at least one available passenger seat."); return; }
    if (demoBalance < fare) { setNotice(`Demo balance is short by ₦${(fare - demoBalance).toLocaleString("en-NG")}. Add demo credits below; no real money is charged.`); return; }
    setDemoBalance((balance) => balance - fare);
    setTicketCode(demoCode());
    setBookingStage("reserved");
    setDemoCompleted(false);
    setNotice("Demo reservation created in this browser. No database record or real payment was made.");
  };

  const resetDemo = () => {
    setBookingStage("none");
    setTicketCode("");
    setDriverSharing(false);
    setDriverAtPickup(false);
    setDriverAtDestination(false);
    setDemoCompleted(false);
    setSelectedSeats([1]);
    setNotice("Demo journey reset. Your simulated balance remains available until this page is refreshed.");
  };

  const facultyDestinationNeedsPin = !destination && studentType === "student";

  return (
    <section className="my-8 overflow-hidden rounded-[26px] border border-lime-300/20 bg-[#071510] text-white shadow-[0_22px_80px_rgba(0,0,0,.28)]" aria-labelledby="qnot-campus-demo-title">
      <div className="border-b border-lime-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(190,242,100,.13),transparent_34%),linear-gradient(120deg,#10251a,#08120e)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2.5 py-1 text-[10px] font-black tracking-[.16em] text-lime-200">UNN CAMPUS DEMO NETWORK</span><span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-100">SIMULATED · NOT LIVE SERVICE</span></div>
            <h2 id="qnot-campus-demo-title" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Your campus. Your pickup. Your ride.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-300">Try the full passenger-to-driver journey using proposed UNN corridors, fictional people, simulated vehicles, demo seats and test credits. No real driver or operator is required.</p>
          </div>
          <div className="min-w-[165px] rounded-2xl border border-lime-300/20 bg-[#07100c]/80 p-3">
            <span className="block text-[10px] font-bold tracking-[.14em] text-neutral-400">DEMO FUNDS · LOCAL ONLY</span>
            <strong className="mt-1 block text-2xl font-black text-lime-200">₦{demoBalance.toLocaleString("en-NG")}</strong>
            <div className="mt-2 flex gap-1.5"><button type="button" onClick={() => setDemoBalance((value) => value + 1000)} className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] font-bold">+₦1k</button><button type="button" onClick={() => setDemoBalance((value) => value + 2000)} className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] font-bold">+₦2k</button></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Choose demo role">
          {([ ["passenger", "Passenger view"], ["driver", "Driver simulator"], ["operator", "Operator simulator"] ] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={role === value} onClick={() => setRole(value)} className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${role === value ? "bg-lime-300 text-[#0c1910]" : "border border-neutral-700 bg-white/5 text-neutral-300 hover:border-lime-300/40"}`}>{label}</button>)}
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.88fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] font-black tracking-[.16em] text-lime-200">CAMPUS MAP / ROUTE PREVIEW</span><h3 className="mt-1 text-lg font-bold">Explore the UNN network</h3></div><span className="text-[10px] text-neutral-500">OpenStreetMap · road line from demo router</span></div>
            <div className="mt-3"><CampusDemoMap pickup={pickup} destination={destination} vehiclePosition={vehiclePosition} passengerPosition={passengerPosition} mapPickMode={mapPickMode} onMapPoint={onMapPoint}/></div>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Green line is an indicative road route where routing data is available. Markers and suggested corridors are planning references, not surveyed boarding bays. Exact campus roads, safe waiting locations and vehicle access must be checked in person.</p>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setMapPickMode(mapPickMode === "pickup" ? null : "pickup")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${mapPickMode === "pickup" ? "border-lime-300 bg-lime-300/10 text-lime-100" : "border-neutral-700 text-neutral-300"}`}>＋ Pin pickup on map</button><button type="button" onClick={() => setMapPickMode(mapPickMode === "destination" ? null : "destination")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${mapPickMode === "destination" ? "border-lime-300 bg-lime-300/10 text-lime-100" : "border-neutral-700 text-neutral-300"}`}>＋ Pin destination on map</button></div>
          </div>

          {role === "passenger" && <>
            <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5">
              <div className="mb-4"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">01 / YOUR PROFILE</span><h3 className="mt-1 text-lg font-bold">Who is travelling?</h3></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-neutral-300">Demo passenger name<select value={passengerName} onChange={(event) => setPassengerName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white">{DEMO_PEOPLE.map((name) => <option key={name}>{name}</option>)}</select></label>
                <label className="text-xs font-semibold text-neutral-300">Traveller type<select value={studentType} onChange={(event) => setStudentType(event.target.value as "student" | "visitor")} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white"><option value="student">UNN student</option><option value="visitor">Visitor / staff</option></select></label>
              </div>
              {studentType === "student" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-neutral-300">Faculty<select value={faculty} onChange={(event) => chooseDepartment(event.target.value, FACULTIES[event.target.value]?.[0] ?? "")} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white">{Object.keys(FACULTIES).map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-neutral-300">Department<select value={department} onChange={(event) => chooseDepartment(faculty, event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white">{departments.map((item) => <option key={item}>{item}</option>)}</select></label></div>}
              {facultyDestinationNeedsPin && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">This destination does not have a verified map pin yet. Choose a suggested campus place or pin the destination on the map.</p>}
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5">
              <div className="mb-4"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">02 / PICKUP & DESTINATION</span><h3 className="mt-1 text-lg font-bold">Where should the vehicle meet you?</h3><p className="mt-1 text-xs text-neutral-400">Start with a campus shortcut or type any destination you have in mind.</p></div>
              <label className="block text-xs font-semibold text-neutral-300">Pickup point<select value={pickup.id} onChange={(event) => { const point = CAMPUS_POINTS.find((item) => item.id === event.target.value); if (point) setPickup(point); setSelectedRoute(""); }} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white">{!CAMPUS_POINTS.some((point) => point.id === pickup.id) && <option value={pickup.id}>{pickup.name} · map pin</option>}{CAMPUS_POINTS.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label>
              <div className="mt-3 flex flex-wrap gap-2">{ROUTE_PRESETS.map((route) => <button key={route.id} type="button" onClick={() => choosePreset(route.id)} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${selectedRoute === route.id ? "border-lime-300/60 bg-lime-300/10 text-lime-100" : "border-neutral-700 bg-[#07120d] text-neutral-300"}`}>{route.label}<small className="mt-1 block font-normal text-neutral-500">{route.duration} · demo corridor</small></button>)}</div>
              <label className="mt-4 block text-xs font-semibold text-neutral-300">Where do you want to go?<input value={destinationText} onChange={(event) => { setDestinationText(event.target.value); const match = CAMPUS_POINTS.find((point) => point.name.toLowerCase() === event.target.value.trim().toLowerCase()); setDestination(match ?? null); setSelectedRoute(""); }} placeholder="Type a faculty, department, hostel or landmark…" className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white placeholder:text-neutral-600"/></label>
              <div className="mt-3 flex flex-wrap gap-2">{CAMPUS_POINTS.map((point) => <button key={point.id} type="button" onClick={() => setDestinationPoint(point)} className={`rounded-full border px-3 py-1.5 text-[11px] ${destination?.id === point.id ? "border-rose-300/50 bg-rose-300/10 text-rose-100" : "border-neutral-700 text-neutral-400 hover:border-neutral-500"}`}>{point.name}</button>)}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><span className="block text-[10px] text-neutral-500">PICKUP</span><strong className="text-sm text-emerald-200">{pickup.name}</strong></div><div><span className="block text-[10px] text-neutral-500">DESTINATION</span><strong className="text-sm text-rose-200">{(destination?.name ?? destinationText) || "Choose or pin a destination"}</strong></div></div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5">
              <div className="mb-4"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">03 / VEHICLE & TIME</span><h3 className="mt-1 text-lg font-bold">Choose the ride you prefer</h3><p className="mt-1 text-xs text-neutral-400">These are fictional demo departures and demo fares.</p></div>
              <div className="grid gap-2 sm:grid-cols-3">{VEHICLES.map((item) => <button key={item.value} type="button" onClick={() => { setVehicleType(item.value); setSelectedSeats([1]); }} className={`rounded-xl border p-3 text-left ${vehicleType === item.value ? "border-lime-300/60 bg-lime-300/10" : "border-neutral-700 bg-[#07120d]"}`}><strong className="block text-sm">{item.label}</strong><span className="mt-1 block text-[11px] text-neutral-400">{item.capacity} seats · ₦{item.fare} demo fare</span><span className="mt-1 block text-[10px] text-neutral-500">{item.description}</span></button>)}</div>
              <div className="mt-4"><VehicleCatalogue3D value={vehicleType} onChange={(value) => { setVehicleType(value); const next = VEHICLES.find((item) => item.value === value); if (next) setSelectedSeats([1]); }}/></div>
              <label className="mt-4 block text-xs font-semibold text-neutral-300">Choose a predictable demo departure<select value={departure} onChange={(event) => setDeparture(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white">{DEMO_SLOTS.map((slot) => <option key={slot} value={slot}>{slot} · every 20 minutes (demo timetable)</option>)}</select></label>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5">
              <div className="mb-3"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">04 / SEAT SELECTION</span><h3 className="mt-1 text-lg font-bold">Choose your seat</h3><p className="mt-1 text-xs text-neutral-400">Select a numbered seat. Grey seats are occupied in this demo; green seats are available.</p></div>
              <div className="flex flex-wrap gap-2">{Array.from({ length: vehicle.capacity }, (_, index) => index + 1).map((seat) => {
                const blocked = vehicle.seats.includes(seat);
                const active = selectedSeats.includes(seat);
                return <button key={seat} type="button" disabled={blocked} onClick={() => toggleSeat(seat)} aria-pressed={active} className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-xs font-black ${blocked ? "cursor-not-allowed border-neutral-800 bg-neutral-800 text-neutral-600" : active ? "border-lime-300 bg-lime-300 text-[#0a170f]" : "border-emerald-700/60 bg-emerald-950/50 text-emerald-100 hover:border-lime-300"}`}><span>{seat}</span><span className="text-[8px] font-medium">{blocked ? "TAKEN" : active ? "YOU" : "FREE"}</span></button>;
              })}</div>
              <p className="mt-3 text-xs text-neutral-400">Selected: {selectedSeats.length ? selectedSeats.map((seat) => `#${seat}`).join(", ") : "None"} · {selectedSeats.length} passenger(s) · Demo fare ₦{fare.toLocaleString("en-NG")}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-[#07120d] p-3"><div><span className="text-[10px] text-neutral-500">DEMO BOOKING TOTAL</span><strong className="block text-xl text-lime-200">₦{fare.toLocaleString("en-NG")}</strong></div><button type="button" onClick={reserveDemoRide} disabled={bookingStage === "reserved" || bookingStage === "boarded"} className="rounded-lg bg-lime-300 px-4 py-3 text-xs font-black text-[#0b170f] disabled:opacity-40">Reserve demo seat(s)</button></div>
            </div>

            {bookingStage !== "none" && <div className="rounded-2xl border border-lime-300/30 bg-lime-300/5 p-4 sm:p-5"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">DEMO BOARDING PASS</span><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">{currentRoute}</h3><p className="mt-1 text-xs text-neutral-300">{passengerName} · {vehicle.label} · {departure} · Seat(s) {selectedSeats.join(", ")}</p></div><span className="rounded-lg bg-lime-300 px-3 py-2 font-mono text-sm font-black text-[#0b170f]">{ticketCode}</span></div><p className="mt-3 text-xs text-neutral-300">Status: <strong className="text-lime-100">{bookingStage === "reserved" ? "Seat reserved (simulated)" : bookingStage === "boarded" ? "Boarded (simulated)" : "Arrived (simulated)"}</strong></p><button type="button" onClick={resetDemo} className="mt-3 rounded-lg border border-neutral-600 px-3 py-2 text-xs font-semibold">Reset this demo journey</button></div>}
          </>}

          {role === "driver" && <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">DRIVER SIMULATOR / DEMO ACCOUNT</span><h3 className="mt-1 text-xl font-bold">Driver workspace</h3><label className="mt-4 block text-xs font-semibold text-neutral-300">Fictional driver<select value={driverName} onChange={(event) => setDriverName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-[#07120d] px-3 py-3 text-sm text-white">{DEMO_DRIVERS.map((name) => <option key={name}>{name}</option>)}</select></label><div className="mt-4 rounded-xl border border-neutral-700 bg-[#07120d] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] text-neutral-500">ASSIGNED DEMO SERVICE</span><strong className="mt-1 block">{currentRoute}</strong><p className="mt-1 text-xs text-neutral-400">{vehicle.label} · {departure} · Driver {driverName}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${driverSharing ? "bg-emerald-900 text-emerald-200" : "bg-neutral-800 text-neutral-400"}`}>{driverSharing ? "GPS SIMULATION ON" : "NOT SHARING"}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { setDriverSharing(true); setDriverAtPickup(false); setDriverAtDestination(false); }} className="rounded-lg bg-lime-300 px-3 py-2.5 text-xs font-black text-[#0b170f]">Start demo service + GPS</button><button type="button" onClick={() => { setDriverSharing(false); setDriverAtPickup(false); setDriverAtDestination(false); }} className="rounded-lg border border-neutral-600 px-3 py-2.5 text-xs font-semibold">Stop GPS</button></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><button type="button" disabled={!driverSharing} onClick={() => { setDriverAtPickup(false); setDriverAtDestination(false); }} className="rounded-lg border border-neutral-700 px-3 py-3 text-xs disabled:opacity-40">Approaching pickup</button><button type="button" disabled={!driverSharing} onClick={() => { setDriverAtPickup(true); setDriverAtDestination(false); }} className="rounded-lg border border-emerald-500/50 px-3 py-3 text-xs text-emerald-200 disabled:opacity-40">Arrive at pickup</button><button type="button" disabled={!driverSharing} onClick={() => { setDriverAtPickup(false); setDriverAtDestination(true); }} className="rounded-lg border border-rose-500/50 px-3 py-3 text-xs text-rose-200 disabled:opacity-40">Arrive at destination</button></div></div><div className="mt-4 rounded-xl border border-neutral-700 p-4"><strong className="text-sm">Passenger booking</strong><p className="mt-1 text-xs text-neutral-400">{ticketCode ? `${passengerName} · ${ticketCode} · seats ${selectedSeats.join(", ")}` : "No passenger booking yet. Switch to Passenger view and reserve a demo seat."}</p><button type="button" disabled={!ticketCode || !passengerAtPickup || !vehicleAtPickup || bookingStage !== "reserved"} onClick={() => setBookingStage("boarded")} className="mt-3 rounded-lg bg-lime-300 px-4 py-2.5 text-xs font-black text-[#0b170f] disabled:cursor-not-allowed disabled:opacity-40">Confirm boarding (GPS proximity check)</button><p className="mt-2 text-[10px] text-neutral-500">Boarding unlocks only when passenger and vehicle demo positions are both within 75 m of the selected pickup point.</p><button type="button" disabled={bookingStage !== "boarded" || !driverAtDestination} onClick={() => { setBookingStage("arrived"); setDemoCompleted(true); }} className="mt-3 block rounded-lg border border-neutral-600 px-4 py-2.5 text-xs font-semibold disabled:opacity-40">Complete journey after reaching destination</button></div></div>}

          {role === "operator" && <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">OPERATOR SIMULATOR</span><h3 className="mt-1 text-xl font-bold">UNN Demo Mobility</h3><p className="mt-1 text-xs text-neutral-400">Fictional operator workspace · no real fleet ownership or driver assignment.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{VEHICLES.map((item) => <article key={item.value} className="rounded-xl border border-neutral-700 bg-[#07120d] p-3"><span className="text-[10px] text-neutral-500">DEMO VEHICLE</span><strong className="mt-1 block text-sm">{item.label}</strong><p className="mt-1 text-xs text-neutral-400">Capacity: {item.capacity}</p><span className="mt-2 inline-block rounded-full bg-emerald-900/70 px-2 py-1 text-[10px] text-emerald-200">SIMULATED / READY</span></article>)}</div><div className="mt-4 space-y-2">{ROUTE_PRESETS.map((route) => <div key={route.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-[#07120d] p-3"><div><strong className="text-sm">{route.label}</strong><p className="mt-1 text-xs text-neutral-500">{route.duration} · proposed corridor · demo schedule every 20 minutes</p></div><button type="button" onClick={() => { choosePreset(route.id); setRole("passenger"); }} className="rounded-lg border border-lime-300/30 px-3 py-2 text-xs font-semibold text-lime-100">Preview route</button></div>)}</div></div>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">LIVE MEETING CHECK</span><h3 className="mt-1 text-lg font-bold">Are both parties at pickup?</h3><p className="mt-1 text-xs text-neutral-400">Q-not compares the passenger phone location and the vehicle location with the selected pickup point.</p><div className="mt-4 space-y-3"><div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-[#07120d] p-3"><div><strong className="text-sm">Passenger</strong><p className="text-[11px] text-neutral-500">{passengerDistance === null ? "Location not available" : `${passengerDistance} m from pickup`}</p></div><span className={`text-xs font-bold ${passengerAtPickup ? "text-emerald-200" : "text-amber-200"}`}>{passengerAtPickup ? "AT PICKUP" : "NOT THERE YET"}</span></div><div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-[#07120d] p-3"><div><strong className="text-sm">Vehicle</strong><p className="text-[11px] text-neutral-500">{vehicleDistance === null ? "Driver GPS not active" : `${vehicleDistance} m from pickup`}</p></div><span className={`text-xs font-bold ${vehicleAtPickup ? "text-emerald-200" : "text-amber-200"}`}>{vehicleAtPickup ? "AT PICKUP" : "NOT THERE YET"}</span></div></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={startDeviceGps} className="rounded-lg border border-sky-300/30 px-3 py-2 text-xs font-semibold text-sky-100">{passengerPosition?.source === "device" ? "Stop device GPS" : "Use my device GPS"}</button><button type="button" onClick={setSimulatedPassengerAtPickup} className="rounded-lg border border-neutral-600 px-3 py-2 text-xs font-semibold">Simulate passenger at pickup</button></div><p className="mt-2 text-[10px] leading-relaxed text-neutral-500">{gpsMessage}</p></div>

          <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">DEMO SERVICE STATUS</span><h3 className="mt-1 text-lg font-bold">Journey timeline</h3><ol className="mt-4 space-y-3 text-xs">{[["01", "Request received", bookingStage !== "none"], ["02", "Vehicle approaching", driverSharing], ["03", "Passenger + vehicle at pickup", passengerAtPickup && vehicleAtPickup], ["04", "Boarding verified", bookingStage === "boarded" || bookingStage === "arrived"], ["05", "Arrival confirmed", bookingStage === "arrived"]].map(([number, label, done]) => <li key={String(number)} className="flex items-center gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${done ? "border-lime-300 bg-lime-300 text-[#08130d]" : "border-neutral-700 text-neutral-500"}`}>{number}</span><span className={done ? "font-semibold text-lime-100" : "text-neutral-400"}>{label}</span></li>)}</ol></div>

          <div className="rounded-2xl border border-neutral-800 bg-[#0b1b13] p-4 sm:p-5"><span className="text-[10px] font-black tracking-[.16em] text-lime-200">DEMO BOUNDARIES</span><ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-neutral-400"><li>• Fictional names, drivers, operator and vehicle availability.</li><li>• Demo routes and fares are not approved campus services.</li><li>• GPS stays in this browser; nothing is sent to the production tracking API.</li><li>• Reservations and demo credits reset when this page is refreshed.</li><li>• This simulator does not reserve real database seats or accept real payments.</li></ul></div>
          {notice && <div role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/5 p-3 text-xs leading-relaxed text-lime-100">{notice}</div>}
          {demoCompleted && <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3 text-xs text-emerald-100">Demo journey completed. The passenger can now reset and test another route.</div>}
          <div className="rounded-xl border border-neutral-800 bg-[#0b1b13] p-4"><div className="flex items-center justify-between gap-3"><div><strong className="text-sm">Need the real passenger workspace?</strong><p className="mt-1 text-xs text-neutral-500">Return to your account and real ticket history.</p></div><Link href="/c/dashboard" className="text-xs font-bold text-lime-200 underline">Dashboard ↗</Link></div></div>
        </aside>
      </div>
    </section>
  );
}
