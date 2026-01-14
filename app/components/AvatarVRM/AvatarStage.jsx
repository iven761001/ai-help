"use client";
import React, { useRef } from "react";
import Avatar3D from "./Avatar3D";

export default function AvatarStage({ vrmId, emotion, unlocked, isApproaching, onModelReady }) {
  const avatarGroupRef = useRef();

  return (
    // 這裡只負責渲染角色，不負責燈光地板
    // Z軸位置設為 -2.0 讓她往後站
    <group ref={avatarGroupRef} name="avatarGroup" position={[0, 0, -2.0]}>
       <Avatar3D 
          vrmId={vrmId} 
          emotion={emotion} 
          unlocked={unlocked} 
          isApproaching={isApproaching}
          onReady={onModelReady}
       />
    </group>
  );
}
