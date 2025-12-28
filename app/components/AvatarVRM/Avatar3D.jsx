"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function Avatar3D({ previewYaw = 0 }) {
  const groupRef = useRef();
  const [vrm, setVrm] = useState(null);

  // 你現在用的 VRM 路徑（public/vrm/avatar.vrm）
  const url = "/vrm/avatar.vrm";

  useEffect(() => {
    let disposed = false;

    const loader = new GLTFLoader();
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        if (disposed) return;

        const loadedVrm = gltf.userData.vrm; // VRM instance
        if (!loadedVrm) {
          console.error("Not a VRM file:", url);
          return;
        }

        // ====== ✅ 自動比例 + 置中 + 腳踩地 ======
        const scene = loadedVrm.scene;

        // 先清掉舊的 transform
        scene.position.set(0, 0, 0);
        scene.rotation.set(0, 0, 0);
        scene.scale.set(1, 1, 1);

        // 算原始 bbox
        const bbox0 = new THREE.Box3().setFromObject(scene);
        const size0 = new THREE.Vector3();
        bbox0.getSize(size0);

        // 目標身高（你想要「全身不小隻」就用 1.75～1.95）
        const targetHeight = 1.85;

        // 避免除以 0
        const h = Math.max(0.0001, size0.y);
        const s = targetHeight / h;

        // 套用縮放
        scene.scale.setScalar(s);

        // 重新計算 bbox（縮放後）
        const bbox = new THREE.Box3().setFromObject(scene);
        const min = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getMin(min);
        bbox.getCenter(center);

        // ✅ 腳踩地：讓 bbox.min.y 變成 0
        scene.position.y += -min.y;

        // ✅ 水平置中：讓中心回到 x=0,z=0
        scene.position.x += -center.x;
        scene.position.z += -center.z;

        // 讓模型材質更穩（避免變黑）
        scene.traverse((o) => {
          if (o.isMesh) {
            o.frustumCulled = false;
            o.castShadow = true;
            o.receiveShadow = true;

            // 讓透明材質更不容易黑掉
            if (o.material) {
              o.material.depthWrite = true;
              o.material.needsUpdate = true;
            }
          }
        });

        setVrm(loadedVrm);
      },
      undefined,
      (err) => {
        console.error("VRM load error:", err);
      }
    );

    return () => {
      disposed = true;
      setVrm(null);
    };
  }, [url]);

  // ✅ 你要的「拖曳旋轉」：旋轉整個 group（之後也能拆頭身）
  const yaw = previewYaw * 1.0;

  return (
    <group ref={groupRef} rotation={[0, yaw, 0]}>
      {vrm ? <primitive object={vrm.scene} /> : null}
    </group>
  );
}
