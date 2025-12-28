// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0, // 由外層手勢驅動
}) {
  const groupRef = useRef();          // 舞台中的容器
  const bodyRef = useRef(null);       // VRM root（會被加入到 group 裡）
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errMsg, setErrMsg] = useState("");

  // ===== 讀取 VRM =====
  useEffect(() => {
    let disposed = false;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    setStatus("loading");
    setErrMsg("");

    loader.load(
      "/vrm/avatar.vrm",
      (gltf) => {
        if (disposed) return;

        const vrm = gltf.userData?.vrm;
        if (!vrm) {
          setStatus("error");
          setErrMsg("不是合法 VRM 檔或解析失敗");
          return;
        }

        // 取消可能的重複骨骼綁定 & 更新材質
        VRMUtils.removeUnnecessaryJoints(vrm.scene);
        VRMUtils.assignAnimationHumanoid(vrm);

        // ===== 自動量身高 → 安全縮放到目標高度 =====
        // 目標舞台高度（公尺概念，不要太大以免鏡頭吃不到）
        const TARGET_HEIGHT = 1.3; // 建議 1.2 ~ 1.4

        // 先重設為 1，避免前一次縮放干擾
        vrm.scene.scale.setScalar(1);
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.set(0, 0, 0);

        // 量模型包圍盒
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        let height = size.y;
        if (!isFinite(height) || height <= 0) {
          // 某些模型 metadata 不齊全時給預設值
          height = 1.6;
        }

        // 等比縮放
        const scale = THREE.MathUtils.clamp(TARGET_HEIGHT / height, 0.2, 3.0);
        vrm.scene.scale.setScalar(scale);

        // 重新取包圍盒並把「腳」放到 y=0；再置中 XZ
        const box2 = new THREE.Box3().setFromObject(vrm.scene);
        const center = new THREE.Vector3();
        box2.getCenter(center);

        // 位移：讓腳貼地（把 minY 拉到 0），同時把 XZ 置中到 (0,0)
        vrm.scene.position.x = vrm.scene.position.x - center.x;
        vrm.scene.position.z = vrm.scene.position.z - center.z;
        vrm.scene.position.y = vrm.scene.position.y - box2.min.y;

        // 防止某些零件被剔除（避免眨眼、髮絲消失等）
        vrm.scene.traverse((o) => {
          o.frustumCulled = false;
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });

        // 放進舞台
        bodyRef.current = vrm.scene;
        groupRef.current?.add(vrm.scene);

        setStatus("ready");
      },
      undefined,
      (err) => {
        if (disposed) return;
        setStatus("error");
        setErrMsg(err?.message || "載入失敗");
        console.error("[VRM load error]", err);
      }
    );

    return () => {
      disposed = true;
      // 清掉舊模型
      if (bodyRef.current && groupRef.current) {
        groupRef.current.remove(bodyRef.current);
      }
      bodyRef.current = null;
    };
  }, []);

  // ===== 旋轉（外層拖曳角度）=====
  useEffect(() => {
    if (!groupRef.current) return;
    // 身體穩定、不要太暈
    const deg = previewYaw * 25;
    groupRef.current.rotation.y = THREE.MathUtils.degToRad(deg);
  }, [previewYaw]);

  // ===== 外觀（顏色/情緒可做後續材質調整；此處保留鉤子）=====
  useEffect(() => {
    // 未來可根據 variant/emotion 調材質或表情
  }, [variant, emotion]);

  // ===== 畫面 =====
  return (
    <group ref={groupRef}>
      {/* Placeholder：載入或錯誤時出現，避免空舞台 */}
      {status !== "ready" && (
        <group>
          {/* 膠囊 */}
          <mesh position={[0, 0.7, 0]}>
            <capsuleGeometry args={[0.25, 0.9, 8, 16]} />
            <meshStandardMaterial color="#7aa7ff" roughness={0.85} metalness={0.05} />
          </mesh>
          {/* 地面小陰影 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[0.6, 32]} />
            <meshBasicMaterial color="black" transparent opacity={0.25} />
          </mesh>

          {/* 小字訊息：手機若被 UI 蓋到可稍微滑動看一下 */}
          <group position={[0, 1.6, 0]}>
            <mesh>
              <planeGeometry args={[1.8, 0.3]} />
              <meshBasicMaterial color="black" transparent opacity={0.4} />
            </mesh>
            {/* 這段只是提示，不影響功能；要拿掉也行 */}
          </group>
        </group>
      )}
    </group>
  );
}
