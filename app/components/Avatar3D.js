"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, AmbientLight, PointLight } from "@react-three/drei";
import { motion } from "framer-motion";

export default function Avatar3D({ variant = "sky", emotion = "idle", position, onDrag }) {

  const colorMap = {
    sky: "#3ba6ff",
    mint: "#36d695",
    purple: "#7b2ff7"
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDrag={(e, info) => {
        onDrag && onDrag(info.point);
      }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 140,
        height: 140,
        zIndex: 9999,        // ★ 永遠浮在最上層
        cursor: "grab",
        touchAction: "none"
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3] }}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent"    // ★ 沒有背景色
        }}
      >
        <AmbientLight intensity={0.7} />
        <PointLight position={[10, 10, 10]} />

        <Sphere args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={colorMap[variant]}
            distort={emotion === "happy" ? 0.5 : emotion === "thinking" ? 0.2 : 0}
            speed={emotion === "happy" ? 2 : 1}
            roughness={0.2}
          />
        </Sphere>
      </Canvas>
    </motion.div>
  );
}
