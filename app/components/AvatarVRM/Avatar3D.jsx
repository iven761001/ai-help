// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Html } from "@react-three/drei";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
}) {
  const groupRef = useRef();
  const modelRef = useRef(null);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errMsg, setErrMsg] = useState("");

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

        try {
          const vrm = gltf?.userData?.vrm;
          if (!vrm || !vrm.scene) {
            setStatus("error");
            setErrMsg("VRM 解析不到 vrm.scene（檔案格式或版本不合）");
            return;
          }

          // === 最穩定的一組清理（避免某些模型直接黑掉/消失） ===
          try { VRMUtils.removeUnnecessaryJoints(vrm.scene); } catch {}
          try { VRMUtils.rotateVRM0(vrm); } catch {}
          try { VRMUtils.sanitizeMaterialProperties(vrm.scene); } catch {}

          // === 量身高 → 等比縮放到舞台安全高度 ===
          const TARGET_HEIGHT = 1.25; // 1.15~1.35 都可以
          vrm.scene.scale.setScalar(1);
          vrm.scene.position.set(0, 0, 0);
          vrm.scene.rotation.set(0, 0, 0);
          vrm.scene.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(vrm.scene);
          const size = new THREE.Vector3();
          box.getSize(size);

          let height = size.y;
          if (!isFinite(height) || height <= 0) height = 1.6;

          const scale = THREE.MathUtils.clamp(TARGET_HEIGHT / height, 0.15, 4.0);
          vrm.scene.scale.setScalar(scale);
          vrm.scene.updateMatrixWorld(true);

          // 腳貼地 & 置中
          const box2 = new THREE.Box3().setFromObject(vrm.scene);
          const center = new THREE.Vector3();
          box2.getCenter(center);

          vrm.scene.position.x -= center.x;
          vrm.scene.position.z -= center.z;
          vrm.scene.position.y -= box2.min.y;

          // 讓臉朝鏡頭（很多 VRM 預設背對）
          vrm.scene.rotation.y = Math.PI;

          // 避免被 frustum cull 掉（手機很常看到「一瞬間出現又消失」）
          vrm.scene.traverse((o) => {
            o.frustumCulled = false;
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });

          // 加入舞台
          modelRef.current = vrm.scene;
          groupRef.current?.add(vrm.scene);

          setStatus("ready");
        } catch (e) {
          console.error("[VRM setup error]", e);
          setStatus("error");
          setErrMsg(e?.message || "VRM 後處理拋錯");
        }
      },
      undefined,
      (err) => {
        if (disposed) return;
        console.error("[VRM load error]", err);
        setStatus("error");
        setErrMsg(err?.message || "VRM 載入失敗");
      }
    );

    return () => {
      disposed = true;
      if (modelRef.current && groupRef.current) {
        groupRef.current.remove(modelRef.current);
      }
      modelRef.current = null;
    };
  }, []);

  // 拖曳旋轉
  useEffect(() => {
    if (!groupRef.current) return;
    const deg = previewYaw * 25;
    groupRef.current.rotation.y = THREE.MathUtils.degToRad(deg);
  }, [previewYaw]);

  // === 舞台內容 ===
  return (
    <group ref={groupRef}>
      {/* 載入中：顯示膠囊 */}
      {status === "loading" && (
        <group>
          <mesh position={[0, 0.65, 0]}>
            <capsuleGeometry args={[0.22, 0.9, 8, 16]} />
            <meshStandardMaterial color="#7aa7ff" roughness={0.85} metalness={0.05} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[0.7, 32]} />
            <meshBasicMaterial color="black" transparent opacity={0.25} />
          </mesh>
          <Html center>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              VRM 載入中…
            </div>
          </Html>
        </group>
      )}

      {/* 失敗：直接把錯誤顯示出來（你就不用再猜） */}
      {status === "error" && (
        <group>
          <mesh position={[0, 0.65, 0]}>
            <capsuleGeometry args={[0.22, 0.9, 8, 16]} />
            <meshStandardMaterial color="#ff6b6b" roughness={0.9} metalness={0.0} />
          </mesh>
          <Html center>
            <div
              style={{
                width: 280,
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                background: "rgba(0,0,0,0.55)",
                padding: "10px 12px",
                borderRadius: 12,
                lineHeight: 1.35,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>VRM 載入失敗</div>
              <div style={{ opacity: 0.9 }}>{errMsg}</div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
