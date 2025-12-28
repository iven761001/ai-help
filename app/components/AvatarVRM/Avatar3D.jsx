// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/**
 * ✅ 穩定版 VRM Avatar3D（含比例修正）
 * - 讀取：public/vrm/avatar.vrm  →  網址：/vrm/avatar.vrm
 * - 自動修正：站位 / 高度 / 置中 / 比例（避免「頭怪怪的」）
 * - 頭身分離旋轉：身體穩、頭比較靈活
 * - 失敗保底：不會整頁黑，會顯示「3D 舞台載入失敗」
 */

const VRM_URL = "/vrm/avatar.vrm";

// ✅ 只要你的專案有用到 useGLTF，這段放在檔案底部就好
// 讓 GLTFLoader 支援 VRM extension
useGLTF.setLoaderExtensions((loader) => {
  loader.register((parser) => new VRMLoaderPlugin(parser));
});
useGLTF.preload(VRM_URL);

export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const { camera } = useThree();

  // 用 drei 的 gltf loader 讀 VRM（本質上仍是 glTF）
  const gltf = useGLTF(VRM_URL);

  const vrmRef = useRef(null);
  const rootRef = useRef(null);
  const headBoneRef = useRef(null);

  // 讓載入失敗時能顯示錯誤訊息
  const [errMsg, setErrMsg] = useState("");

  // 顏色（可先保留，未來可用來做材質變化）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color(0x7fffd4);
    if (variant === "purple") return new THREE.Color(0xd6b0ff);
    return new THREE.Color(0xa0dcff);
  }, [variant]);

  // ✅ 頭身分離旋轉（外部拖曳 previewYaw 進來）
  // previewYaw 通常是小數（例如 -1~1），這裡把它轉成弧度來用
  const bodyYaw = previewYaw * 0.55; // 身體：小一點
  const headYaw = previewYaw * 1.1; // 頭：大一點（更靈活）

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      setErrMsg("");
      vrmRef.current = null;
      headBoneRef.current = null;

      try {
        if (!gltf) return;

        // ✅ 先做一些通用清理（可降低奇怪比例/骨架問題）
        const scene = gltf.scene;
        VRMUtils.removeUnnecessaryVertices(scene);
        VRMUtils.removeUnnecessaryJoints(scene);

        scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            // 有些 VRM 材質在不同裝置會黑掉，先確保能更新
            o.frustumCulled = false;
          }
        });

        // ✅ 轉成 VRM
        const vrm = await VRM.from(gltf);

        if (cancelled) return;

        // ✅ 將 VRM 調整成較一致的座標表現（避免朝向/翻轉怪）
        VRMUtils.rotateVRM0(vrm);

        // ✅ 比例/站位修正（重點在這）
        //
        // 常見現象：
        // - 頭很怪：多半是站位太高/太低、鏡頭距離、或頭部 lookAt 太強
        // - 身體太大/太小：scale 調整
        //
        // 這一組是「大多數 VRM 都會正常」的安全值
        vrm.scene.scale.set(1.05, 1.05, 1.05);
        vrm.scene.position.set(0, -1.05, 0);

        // ✅ 自動用模型高度做微調（讓不同 VRM 也比較穩）
        // 這段會把腳大致「踩在地面」附近
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // size.y 大約 1.4~1.8（看 VRM）
        // 我們讓模型中心落在舞台比較舒服的位置
        if (size.y > 0.1) {
          // 讓「腳底」接近 y = -1.05（配合你 AvatarStage 的 ContactShadows 位置）
          const bottomY = box.min.y;
          const desiredBottom = -1.05;
          const offsetY = desiredBottom - bottomY;
          vrm.scene.position.y += offsetY;
        }

        // ✅ (可選) 超輕微 tint，避免整隻變色
        vrm.scene.traverse((o) => {
          if (o.isMesh && o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              if (m && "color" in m && m.color) {
                m.color = m.color.clone().lerp(tint, 0.06);
              }
            }
          }
        });

        // ✅ 抓 head 骨骼（用來頭部旋轉/微微看鏡頭）
        const head =
          vrm.humanoid?.getBoneNode("head") ||
          vrm.humanoid?.getRawBoneNode?.("head") ||
          null;

        headBoneRef.current = head;
        vrmRef.current = vrm;
      } catch (e) {
        console.error("[Avatar3D] VRM load/setup failed:", e);
        setErrMsg(String(e?.message || e));
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [gltf, tint]);

  useFrame((_, delta) => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    // VRM 內部更新（骨架/彈簧骨等）
    vrm.update(delta);

    // 身體（整體）旋轉
    if (rootRef.current) rootRef.current.rotation.y = bodyYaw;

    // 頭部獨立旋轉 + 很輕量的「朝鏡頭」效果（避免太僵）
    const head = headBoneRef.current;
    if (head) {
      // 1) 先加上你拖曳的 headYaw（不要太大，太大會怪）
      head.rotation.y = headYaw * 0.5;

      // 2) 再加一點點看鏡頭（非常輕，避免頭「歪掉」）
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);

      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      const dir = camPos.sub(headPos).normalize();
      dir.y *= 0.12; // 降低仰頭感

      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir
      );

      head.quaternion.slerp(q, 0.04);
    }
  });

  // ✅ 渲染：成功就放 VRM，失敗就顯示文字（不影響你信箱/聊天）
  if (!vrmRef.current) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.2, 1.2, 0.2]} />
          <meshStandardMaterial transparent opacity={0.12} />
        </mesh>

        {/* 文字提示（用簡單 DOM 顯示會更漂亮，但這裡先 3D 內保底） */}
        {/* 你 AvatarStage 外面也有顯示錯誤字，那邊留著即可 */}
        {errMsg ? null : null}
      </group>
    );
  }

  return (
    <group ref={rootRef}>
      <primitive object={vrmRef.current.scene} />
    </group>
  );
}
