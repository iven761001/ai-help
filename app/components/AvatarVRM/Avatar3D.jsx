"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const VRM_URL = "/vrm/avatar.vrm";

// ✅ 把 VRM「高度」統一到這個值（你可微調：1.35~1.6）
const TARGET_HEIGHT = 1.45;

export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const group = useRef();
  const vrmRef = useRef(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // 顏色（給 placeholder 用）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color("#7dffd2");
    if (variant === "purple") return new THREE.Color("#d2aaff");
    return new THREE.Color("#a0dcff");
  }, [variant]);

  // ✅ 身體/頭 分離旋轉：body 比較小、head 比較大
  const bodyYaw = previewYaw * 0.7; // radians-ish
  const headYaw = previewYaw * 1.35;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      setLoading(true);

      try {
        // ✅ 關鍵：動態 import，避免 Next server/prerender 先碰到 three-vrm
        const [{ GLTFLoader }, vrmPkg] = await Promise.all([
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("@pixiv/three-vrm"),
        ]);

        const { VRM, VRMUtils } = vrmPkg;

        const loader = new GLTFLoader();

        // 有些 vrm 會需要 crossOrigin
        loader.setCrossOrigin?.("anonymous");

        loader.load(
          VRM_URL,
          async (gltf) => {
            if (cancelled) return;

            // three-vrm 推薦的清理
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);

            const vrm = await VRM.from(gltf, { autoUpdateHumanBones: true });

            if (cancelled) return;

            // 讓 vrm 正向
            VRMUtils.rotateVRM0(vrm);

            // ✅ 比例/位置修正：把 VRM 置中 + 腳貼地 + 统一高度
            normalizeVRM(vrm.scene, TARGET_HEIGHT);

            // 儲存
            vrmRef.current = vrm;

            // ✅ 確保一定加到 group 底下（避免被 unmount）
            if (group.current) {
              // 清掉舊的
              while (group.current.children.length) group.current.remove(group.current.children[0]);
              group.current.add(vrm.scene);
            }

            setLoading(false);
          },
          undefined,
          (e) => {
            if (cancelled) return;
            setErr(`Could not load ${VRM_URL}: ${e?.message || e}`);
            setLoading(false);
          }
        );
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      // 不強制 dispose，避免你看到「載到一瞬間後消失」的狀況再發生
      vrmRef.current = null;
    };
  }, []);

  useFrame((state, delta) => {
    // 讓 VRM internal update（表情/物理/骨架）有機會跑
    if (vrmRef.current) vrmRef.current.update(delta);

    // ✅ 身體旋轉
    if (group.current) {
      group.current.rotation.y = bodyYaw;
    }

    // ✅ 頭部旋轉（改 head 或 neck bone）
    const vrm = vrmRef.current;
    if (vrm?.humanoid) {
      const head =
        vrm.humanoid.getNormalizedBoneNode("head") ||
        vrm.humanoid.getNormalizedBoneNode("neck");

      if (head) {
        // 稍微限制一下不要轉太大
        head.rotation.y = THREE.MathUtils.clamp(headYaw, -0.8, 0.8);
      }
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* ✅ Loading placeholder：不要讓你看到空白 */}
      {(loading || err) && (
        <group>
          <mesh position={[0, TARGET_HEIGHT * 0.55, 0]}>
            <capsuleGeometry args={[0.28, 0.55, 8, 16]} />
            <meshStandardMaterial color={tint} transparent opacity={0.35} />
          </mesh>

          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 32]} />
            <meshStandardMaterial color={new THREE.Color("#000000")} transparent opacity={0.22} />
          </mesh>

          <Html center>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                color: "rgba(255,255,255,0.75)",
                fontSize: 12,
                maxWidth: 260,
                textAlign: "center",
                lineHeight: 1.35,
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              {err ? (
                <>
                  VRM 載入失敗<br />
                  <span style={{ opacity: 0.85 }}>{err}</span>
                </>
              ) : (
                "VRM 載入中…"
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/**
 * ✅ 把模型：
 * 1) bbox 置中（x,z）
 * 2) 腳貼地（y=0）
 * 3) 統一高度到 targetHeight
 */
function normalizeVRM(scene, targetHeight) {
  // 先算 bbox
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // 防呆
  if (!isFinite(size.y) || size.y <= 0.0001) return;

  // 1) 先把中心移到原點（x,z）
  scene.position.x -= center.x;
  scene.position.z -= center.z;

  // 2) 腳貼地：重新算 bbox（因為剛移動過）
  const box2 = new THREE.Box3().setFromObject(scene);
  const minY = box2.min.y;
  scene.position.y -= minY;

  // 3) 統一高度
  const box3 = new THREE.Box3().setFromObject(scene);
  const h = box3.max.y - box3.min.y;
  const s = targetHeight / h;
  scene.scale.setScalar(s);

  // 縮放後再貼一次地（保險）
  const box4 = new THREE.Box3().setFromObject(scene);
  scene.position.y -= box4.min.y;

  // 讓材質不要太暗
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      obj.frustumCulled = false;
      const m = obj.material;
      if (m) {
        m.transparent = m.transparent ?? false;
      }
    }
  });
}
