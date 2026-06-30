"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * MeshHero — the one piece of ambient motion on the landing page, and it earns
 * its place: a slowly rotating relay mesh. Nodes are field units; the dim lines
 * are the links between them; the bright travelling dots are packets hopping
 * across the net. It reports the product's core idea (peers coordinating over a
 * relayed network) rather than decorating. Near-black canvas, one green voice.
 *
 * Honors prefers-reduced-motion (renders a single static frame, no packets in
 * motion), caps DPR, and pauses entirely when scrolled out of view.
 */

const NODE_COUNT = 46;
const NEIGHBORS = 3; // edges seeded per node toward nearest peers
const PACKET_COUNT = 14;
const ACCENT = new THREE.Color("#3ddc84");
const ACCENT_DIM = new THREE.Color("#1f7a4d");

type Edge = { a: number; b: number };

export function MeshHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#0a0e0d", 0.085);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Build the graph: nodes on a loose spherical shell, edges to neighbors.
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      // Fibonacci sphere for an even, non-clumpy spread, then jittered radius.
      const phi = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 6.2 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 1.6;
      positions.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * r,
          Math.cos(phi) * r * 0.62, // flatten vertically — reads as terrain, not a ball
          Math.sin(phi) * Math.sin(theta) * r,
        ),
      );
    }

    const edges: Edge[] = [];
    const seen = new Set<string>();
    positions.forEach((p, i) => {
      const near = positions
        .map((q, j) => ({ j, d: p.distanceTo(q) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, NEIGHBORS);
      for (const { j } of near) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ a: i, b: j });
      }
    });

    const group = new THREE.Group();
    scene.add(group);

    // Links — dim green hairlines.
    const linkGeo = new THREE.BufferGeometry();
    const linkPos = new Float32Array(edges.length * 6);
    edges.forEach((e, k) => {
      positions[e.a].toArray(linkPos, k * 6);
      positions[e.b].toArray(linkPos, k * 6 + 3);
    });
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
    const links = new THREE.LineSegments(
      linkGeo,
      new THREE.LineBasicMaterial({
        color: ACCENT_DIM,
        transparent: true,
        opacity: 0.32,
      }),
    );
    group.add(links);

    // Nodes — small bright units.
    const nodeGeo = new THREE.BufferGeometry();
    const nodePos = new Float32Array(NODE_COUNT * 3);
    positions.forEach((p, i) => p.toArray(nodePos, i * 3));
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    const nodes = new THREE.Points(
      nodeGeo,
      new THREE.PointsMaterial({
        color: ACCENT,
        size: 0.16,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
      }),
    );
    group.add(nodes);

    // Packets — bright dots that hop along edges. The traffic.
    type Packet = { edge: number; t: number; speed: number; dir: 1 | -1 };
    const packets: Packet[] = Array.from({ length: PACKET_COUNT }, () => ({
      edge: Math.floor(Math.random() * edges.length),
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.22,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));
    const packetGeo = new THREE.BufferGeometry();
    const packetPos = new Float32Array(PACKET_COUNT * 3);
    packetGeo.setAttribute("position", new THREE.BufferAttribute(packetPos, 3));
    const packetPoints = new THREE.Points(
      packetGeo,
      new THREE.PointsMaterial({
        color: ACCENT,
        size: 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
      }),
    );
    group.add(packetPoints);

    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    function writePackets() {
      packets.forEach((pk, i) => {
        const e = edges[pk.edge];
        tmpA.copy(positions[e.a]);
        tmpB.copy(positions[e.b]);
        const t = pk.dir === 1 ? pk.t : 1 - pk.t;
        tmpA.lerp(tmpB, t).toArray(packetPos, i * 3);
      });
      packetGeo.attributes.position.needsUpdate = true;
    }
    writePackets();

    // --- Sizing
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h || 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // --- Pointer parallax (desktop only; quietly ignored on touch)
    const pointer = { x: 0, y: 0 };
    function onPointer(ev: PointerEvent) {
      pointer.x = (ev.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (ev.clientY / window.innerHeight - 0.5) * 2;
    }
    if (!reduceMotion) window.addEventListener("pointermove", onPointer);

    // --- Pause when offscreen
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !reduceMotion) loop();
      },
      { threshold: 0 },
    );
    io.observe(mount);

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      group.rotation.y += dt * 0.045;
      // Ease the group toward the pointer for a subtle parallax tilt.
      group.rotation.x += (pointer.y * 0.18 - group.rotation.x) * 0.04;
      camera.position.x += (pointer.x * 1.1 - camera.position.x) * 0.04;
      camera.lookAt(0, 0, 0);

      packets.forEach((pk) => {
        pk.t += pk.speed * dt;
        if (pk.t >= 1) {
          // Arrived: hop onto a random edge touching the node we landed on.
          const e = edges[pk.edge];
          const node = pk.dir === 1 ? e.b : e.a;
          const options = edges.filter((x) => x.a === node || x.b === node);
          const next = options[Math.floor(Math.random() * options.length)];
          pk.edge = edges.indexOf(next);
          pk.dir = next.a === node ? 1 : -1;
          pk.t = 0;
          pk.speed = 0.12 + Math.random() * 0.22;
        }
      });
      writePackets();

      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(frame);
    }
    function loop() {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    if (reduceMotion) {
      // Static frame: graph at rest, packets frozen mid-edge. No loop.
      group.rotation.set(0.12, 0.5, 0);
      renderer.render(scene, camera);
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      renderer.dispose();
      linkGeo.dispose();
      nodeGeo.dispose();
      packetGeo.dispose();
      (links.material as THREE.Material).dispose();
      (nodes.material as THREE.Material).dispose();
      (packetPoints.material as THREE.Material).dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
