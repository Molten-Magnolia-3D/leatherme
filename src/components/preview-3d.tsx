"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { buildPlateMesh } from "@/lib/geometry/mesh";
import type { Piece, StitchPlan, StitchSettings } from "@/lib/geometry/types";
import { ringBBox } from "@/lib/geometry/vec";
import * as THREE from "three";

function Plate({
  piece,
  settings,
  scalePct,
  plan,
}: {
  piece: Piece;
  settings: StitchSettings;
  scalePct: number;
  plan: StitchPlan;
}) {
  const geometry = useMemo(() => {
    const mesh = buildPlateMesh(piece, settings, scalePct, plan);
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    for (const [ia, ib, ic] of mesh.faces) {
      const a = mesh.vertices[ia];
      const b = mesh.vertices[ib];
      const c = mesh.vertices[ic];
      if (!a || !b || !c) continue;
      positions.push(...a, ...b, ...c);
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const nx = ab[1] * ac[2] - ab[2] * ac[1];
      const ny = ab[2] * ac[0] - ab[0] * ac[2];
      const nz = ab[0] * ac[1] - ab[1] * ac[0];
      const len = Math.hypot(nx, ny, nz) || 1;
      for (let i = 0; i < 3; i++) normals.push(nx / len, ny / len, nz / len);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    return geo;
  }, [piece, plan, scalePct, settings]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#c08958" roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function Frame({ piece, scalePct }: { piece: Piece; scalePct: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const box = ringBBox(piece.outline);
    const span = Math.max(box.width, box.height) * (scalePct / 100);
    camera.position.set(span * 0.7, span * 0.85, span * 0.7);
    camera.lookAt(0, 0, 0);
  }, [camera, piece, scalePct]);
  return null;
}

export function Preview3D({
  piece,
  settings,
  scalePct,
  plan,
}: {
  piece: Piece | null;
  settings: StitchSettings;
  scalePct: number;
  plan: StitchPlan | null;
}) {
  if (!piece || !plan) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center text-sm text-muted-foreground">
        The 3D plate preview appears after a pattern is read.
      </div>
    );
  }

  return (
    <Canvas camera={{ position: [80, 90, 80], fov: 40 }} className="h-full min-h-56">
      <color attach="background" args={["#22160f"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[40, 80, 30]} intensity={1.2} />
      <directionalLight position={[-30, 20, -40]} intensity={0.35} />
      <Plate piece={piece} settings={settings} scalePct={scalePct} plan={plan} />
      <Frame piece={piece} scalePct={scalePct} />
      <gridHelper args={[200, 20, "#6b4a32", "#3a281c"]} />
      <OrbitControls enablePan enableZoom makeDefault />
    </Canvas>
  );
}
