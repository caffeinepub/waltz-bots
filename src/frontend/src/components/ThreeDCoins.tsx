import {
  Environment,
  Float,
  MeshDistortMaterial,
  Sparkles,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

function GoldCoin({
  position,
  rotationSpeed = 0.4,
  floatSpeed = 1,
  label,
}: {
  position: [number, number, number];
  rotationSpeed?: number;
  floatSpeed?: number;
  label?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const time = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    time.current += delta * floatSpeed;
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotationSpeed;
      meshRef.current.rotation.x = Math.sin(time.current * 0.5) * 0.15;
      meshRef.current.position.y = position[1] + Math.sin(time.current) * 0.25;
    }
  });

  return (
    <group position={position}>
      {/* Coin body */}
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[1, 1, 0.15, 64]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={0.95}
          roughness={0.08}
          envMapIntensity={2.5}
        />
      </mesh>
      {/* Edge ring glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[1.05, 0.04, 16, 64]} />
        <meshStandardMaterial
          color="#F2D27A"
          metalness={1}
          roughness={0}
          emissive="#F2D27A"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Coin face detail */}
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 32]} />
        <meshStandardMaterial
          color="#E8C040"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      {label && (
        <Sparkles
          count={6}
          scale={2.5}
          size={1.2}
          speed={0.4}
          opacity={0.7}
          color="#F2D27A"
        />
      )}
    </group>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(clock.getElapsedTime() * 0.2) * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Bitcoin-style coin */}
      <GoldCoin
        position={[-1.8, 0, 0]}
        rotationSpeed={0.35}
        floatSpeed={0.9}
        label="BTC"
      />
      {/* Ethereum-style coin */}
      <GoldCoin
        position={[1.8, 0.5, -0.5]}
        rotationSpeed={0.55}
        floatSpeed={1.2}
      />
      {/* WB custom coin */}
      <GoldCoin
        position={[0, -0.4, 1]}
        rotationSpeed={0.28}
        floatSpeed={0.75}
        label="WB"
      />

      {/* Global sparkles */}
      <Sparkles
        count={40}
        scale={6}
        size={0.8}
        speed={0.3}
        opacity={0.5}
        color="#D4AF37"
      />

      {/* Lights */}
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={3} color="#F2D27A" />
      <pointLight position={[-5, -3, 3]} intensity={1.5} color="#4488FF" />
      <pointLight position={[0, 8, -3]} intensity={2} color="#FFFFFF" />
    </group>
  );
}

export function ThreeDCoins() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 7], fov: 38 }}
      style={{ background: "transparent" }}
      shadows
    >
      <Environment preset="city" />
      <Scene />
    </Canvas>
  );
}
