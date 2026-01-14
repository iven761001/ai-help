"use client";
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";

export default function StageEnvironment() {
  const cameraRef = useRef();

  useFrame((state) => {
      // 讓攝影機有些微的呼吸感，增加活著的感覺
      if (cameraRef.current) {
         const x = state.pointer.x * 0.2;
         const y = state.pointer.y * 0.2;
         cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, x, 0.05);
         cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 1.4 + y, 0.05);
         cameraRef.current.lookAt(0, 1.0, 0); 
      }
  });

  return (
    <>
      <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 1.4, 4.5]} fov={40} />
      
      {/* 燈光設置 */}
      <ambientLight intensity={1.5} color="#b0e0ff" /> 
      <directionalLight position={[5, 5, 5]} intensity={2} color="#00aaff" />
      <spotLight position={[0, 5, 2]} intensity={4} distance={15} angle={0.6} penumbra={0.5} color="#ffffff"/>
      <Environment preset="city" />
      
      {/* 地板與特效 */}
      <Grid position={[0, 0, 0]} args={[30, 30]} cellSize={0.6} cellThickness={0.6} cellColor="#00ffff" sectionSize={3} sectionThickness={1} sectionColor="#00aaff" fadeDistance={25} infiniteGrid />
      <Sparkles count={200} scale={[10, 10, 10]} size={3} speed={0.4} opacity={0.5} color="#00ffff" noise={0.1} position={[0, 5, 0]} />
    </>
  );
}
