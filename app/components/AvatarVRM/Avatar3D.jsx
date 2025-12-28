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

          // === 清理（穩定顯示）===
          try { VRMUtils.removeUnnecessaryJoints(vrm.scene); } catch {}
          try { VRMUtils.rotateVRM0(vrm); } catch {}
          try { VRMUtils.sanitizeMaterialProperties(vrm.scene); } catch {}

          // reset
          vrm.scene.scale.setScalar(1);
          vrm.scene.position.set(0, 0, 0);
          vrm.scene.rotation.set(0, 0, 0);
          vrm.scene.updateMatrixWorld(true);

          // === 算 bbox ===
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          let height = size.y;
          if (!isFinite(height) || height <= 0) height = 1.6;

          // ✅ 舞台「安全高度」：你這個 UI 框比較高，所以用 1.05~1.15 會比較不會爆頭
          const TARGET_HEIGHT = 1.1;

          const scale = THREE.MathUtils.clamp(TARGET_HEIGHT / height, 0.15, 4.0);
          vrm.scene.scale.setScalar(scale);
          vrm.scene.updateMatrixWorld(true);

          // 重新算 bbox（因為縮放過）
          const box2 = new THREE.Box3().setFromObject(vrm.scene);
          const size2 = new THREE.Vector3();
          const center2 = new THREE.Vector3();
          box2.getSize(size2);
          box2.getCenter(center2);

          // === 置中：X/Z 置中，Y 腳貼地 ===
          vrm.scene.position.x -= center2.x;
          vrm.scene.position.z -= center2.z;
          vrm.scene.position.y -= box2.min.y;

          // ✅ 再把整個人往下壓一點（關鍵：避免頭出框）
          // 你可以調整這個比例：0.06~0.16 都常用
          vrm.scene.position.y -= size2.y * 0.12;

          // 面向鏡頭（很多 VRM 背對）
          vrm.scene.rotation.y = Math.PI;

          // 避免手機 frustum 一閃就消失
          vrm.scene.traverse((o) => {
            o.frustumCulled = false;
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });

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

  return (
    <group ref={groupRef}>
      {status === "loading" && (
        <group>
          <mesh position={[0, 0.65, 0]}>
            <capsuleGeometry args={[0.22, 0.9, 8, 16]} />
            <meshStandardMaterial color="#7aa7ff" roughness={0.85} metalness={0.05} />
          </mesh>
          <Html center>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              VRM 載入中…
            </div>
          </Html>
        </group>
      )}

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
