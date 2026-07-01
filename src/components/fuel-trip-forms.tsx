"use client";

import { Capacitor } from "@capacitor/core";
import { Geolocation, type Position } from "@capacitor/geolocation";
import { MapPin, Play, Smartphone, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Option = { address?: string; id: string; label: string };
type Point = {
  accuracy: number | null;
  latitude: number;
  longitude: number;
  recordedAt: string;
};
type ActiveWatch = { id: number | string; platform: "native" | "web" };

function miles(a: Point, b: Point) {
  const radius = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitude = toRadians(b.latitude - a.latitude);
  const longitude = toRadians(b.longitude - a.longitude);
  const calculation =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(calculation));
}

export function FuelTripForms({
  customers,
  manualAction,
  trackedAction,
  vehicles,
}: {
  customers: Option[];
  manualAction: (data: FormData) => Promise<void>;
  trackedAction: (data: FormData) => Promise<void>;
  vehicles: Option[];
}) {
  const [distance, setDistance] = useState(0);
  const [error, setError] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [trackedEnd, setTrackedEnd] = useState("");
  const [tracking, setTracking] = useState(false);
  const watch = useRef<ActiveWatch | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const isNative = Capacitor.isNativePlatform();

  function recordPoint(position: Position | GeolocationPosition) {
    const next: Point = {
      accuracy: Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      recordedAt: new Date(position.timestamp).toISOString(),
    };

    setPoints((current) => {
      const previous = current[current.length - 1];
      if (previous) {
        const segment = miles(previous, next);
        if (segment < 1) setDistance((total) => total + segment);
      }
      return [...current, next].slice(-5000);
    });
  }

  async function clearTrackingResources() {
    const activeWatch = watch.current;
    watch.current = null;
    if (activeWatch?.platform === "native") {
      await Geolocation.clearWatch({ id: String(activeWatch.id) }).catch(() => undefined);
    } else if (activeWatch) {
      navigator.geolocation.clearWatch(Number(activeWatch.id));
    }
    await wake.current?.release().catch(() => undefined);
    wake.current = null;
  }

  useEffect(() => {
    return () => {
      void clearTrackingResources();
    };
  }, []);

  async function start() {
    setError("");
    setPoints([]);
    setDistance(0);

    try {
      if (isNative) {
        const permission = await Geolocation.requestPermissions({
          permissions: ["location"],
        });
        if (permission.location !== "granted") {
          throw new Error("permission-denied");
        }

        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            maximumAge: 3000,
            minimumUpdateInterval: 3000,
            timeout: 15000,
          },
          (position, reason) => {
            if (position) recordPoint(position);
            if (reason) setError("GPS position could not be read. Move outdoors and try again.");
          },
        );
        watch.current = { id, platform: "native" };
      } else {
        if (!navigator.geolocation) throw new Error("gps-unavailable");
        const nav = navigator as Navigator & {
          wakeLock?: {
            request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
          };
        };
        wake.current = (await nav.wakeLock?.request("screen")) ?? null;
        const id = navigator.geolocation.watchPosition(
          recordPoint,
          (reason) => {
            setError(
              reason.code === 1
                ? "Location permission was denied. Allow location access in your browser settings."
                : "GPS position could not be read. Move outdoors and try again.",
            );
            setTracking(false);
          },
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
        );
        watch.current = { id, platform: "web" };
      }
      setTracking(true);
    } catch (reason) {
      setTracking(false);
      setError(
        reason instanceof Error && reason.message === "gps-unavailable"
          ? "GPS is not available on this device."
          : "Location permission was denied. Allow location access in your phone settings.",
      );
    }
  }

  async function stop() {
    await clearTrackingResources();
    setTracking(false);
  }

  const vehicleSelect = (name: string) => (
    <select className="field-control" name={name} required>
      <option value="">Choose vehicle</option>
      {vehicles.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {vehicle.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="surface-pad">
        <h2 className="font-semibold">Add trip manually</h2>
        <form action={manualAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          {vehicleSelect("vehicle_id")}
          <input className="field-control" name="purpose" placeholder="Purpose of trip" />
          <input className="field-control" name="start_address" placeholder="Leaving destination" required />
          <select
            className="field-control"
            defaultValue=""
            name="customer_id"
            onChange={(event) => {
              const customer = customers.find((item) => item.id === event.target.value);
              if (customer?.address) setManualEnd(customer.address);
            }}
          >
            <option value="">Select customer (optional)</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.label}</option>
            ))}
          </select>
          <input className="field-control" name="end_address" onChange={(event) => setManualEnd(event.target.value)} placeholder="Arriving destination" required value={manualEnd} />
          <input className="field-control" name="distance_miles" min="0" placeholder="Miles" step="0.01" type="number" />
          <input className="field-control" name="start_odometer" min="0" placeholder="Start odometer" step="0.1" type="number" />
          <input className="field-control" name="end_odometer" min="0" placeholder="End odometer" step="0.1" type="number" />
          <input className="field-control" name="started_at" type="datetime-local" />
          <input className="field-control" name="ended_at" type="datetime-local" />
          <button className="btn-primary sm:col-span-2">Save manual trip</button>
        </form>
      </section>

      <section className="surface-pad">
        <div className="flex items-center gap-3">
          {isNative ? <Smartphone className="text-copper" /> : <MapPin className="text-copper" />}
          <div>
            <h2 className="font-semibold">Phone auto tracker</h2>
            <p className="text-sm text-slate-500">
              {isNative ? "Native phone GPS is ready." : "Keep this screen open while travelling."}
            </p>
          </div>
        </div>
        <form action={trackedAction} className="mt-5 space-y-4">
          {vehicleSelect("vehicle_id")}
          <input className="field-control" name="purpose" placeholder="Purpose of trip" />
          <input className="field-control" name="start_address" placeholder="Leaving destination (optional)" />
          <select
            className="field-control"
            name="customer_id"
            onChange={(event) => {
              const customer = customers.find((item) => item.id === event.target.value);
              if (customer?.address) setTrackedEnd(customer.address);
            }}
          >
            <option value="">Select customer destination</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}{customer.address ? ` - ${customer.address}` : ""}
              </option>
            ))}
          </select>
          <input className="field-control" name="end_address" onChange={(event) => setTrackedEnd(event.target.value)} placeholder="Arriving destination (optional)" value={trackedEnd} />
          <input name="points" type="hidden" value={JSON.stringify(points)} />
          <input name="distance_miles" type="hidden" value={distance.toFixed(3)} />
          {error ? <p className="notice">{error}</p> : null}
          <div className="rounded-lg border border-field bg-mist p-5 text-center">
            <p className="text-sm text-slate-500">Live distance</p>
            <p className="mt-1 text-3xl font-semibold">{distance.toFixed(2)} mi</p>
            <p className="mt-1 text-xs text-slate-500">{points.length} GPS points</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!tracking ? (
              <button className="btn-accent" onClick={start} type="button"><Play size={17} />Start tracking</button>
            ) : (
              <button className="btn-secondary" onClick={stop} type="button"><Square size={17} />Stop tracking</button>
            )}
            <button className="btn-primary" disabled={tracking || points.length < 2}>Save tracked trip</button>
          </div>
        </form>
      </section>
    </div>
  );
}
