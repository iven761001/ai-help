"use client";
import React, { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid, Sparkles, Environment } from "@react-three/drei";
import Avatar3D from "./Avatar3D";
import * as THREE from "three";

export default function AvatarStage({ vrmId, emotion, unlocked, isApproaching, onModelReady }) {
  const cameraRef = useRef();
  const avatarGroupRef = useRef();
  const { camera } = useThree();

  useFrame((state) => {
      if (avatarGroupRef.current) {
         // 這裡可以加上攝影機跟隨滑鼠的微動效果，增加臨場感
         const x = state.pointer.x * 0.2;
         const y = state.pointer.y * 0.2;
         camera.position.x = THREE.MathUtils.lerp(camera.position.x, x, 0.05);
         camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.4 + y, 0.05);
         camera.lookAt(0, 1.0, 0); // 攝影機永遠看著角色胸口位置
      }
  });

  return (
    <>
      {/* 攝影機位置固定，我們移動角色 */}
      <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 1.4, 4.5]} fov={40} />
      
      <ambientLight intensity={1.5} color="#b0e0ff" /> 
      <directionalLight position={[5, 5, 5]} intensity={2} color="#00aaff" shadow-mapSize={2048} castShadow />
      <spotLight position={[0, 5, 2]} intensity={4} distance={15} angle={0.6} penumbra={0.5} color="#ffffff"/>
      <Environment preset="city" />
      
      <Grid position={[0, 0, 0]} args={[30, 30]} cellSize={0.6} cellThickness={0.6} cellColor="#00ffff" sectionSize={3} sectionThickness={1} sectionColor="#00aaff" fadeDistance={25} infiniteGrid />
      <Sparkles count={200} scale={[10, 10, 10]} size={3} speed={0.4} opacity={0.5} color="#00ffff" noise={0.1} position={[0, 5, 0]} />

      {/* 🌟 關鍵修改：將 Z 改為 -2.0，讓角色往後退 */}
      <group ref={avatarGroupRef} name="avatarGroup" position={[0, 0, -2.0]}>
         <Avatar3D 
            vrmId={vrmId} 
            emotion={emotion} 
            unlocked={unlocked} 
            isApproaching={isApproaching}
            onReady={onModelReady}
         />
      </group>
    </>
  );
}
