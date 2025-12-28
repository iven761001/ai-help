// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * 穩定版 VRM Loader（避免 useGLTF/useLoader 的 SSR/prerender 雷）
 * - 預設讀取：/vrm/avatar.vrm   (放在 public/vrm/avatar.vrm)
 * - 自動比例修正：把模型縮放到「合理高度」並把腳貼地
 * - previewYaw：提供外層拖曳旋轉（Page 的 useDragRotate）
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  url = "/vrm/avatar.vrm"
}) {
  const rootRef = useRef();          // 旋轉容器
  const vrmHolderRef = useRef(null); // 實際 VRM scene 放這裡
  const [ready, setReady] = useState(false);

  // 顏色提示：你之後可以用來改材質或光色（先不硬改 VRM 材質，保穩）
  const tint = useMemo(() => {
    if (variant === "mint") return [0.45, 1.0, 0.85];
    if (variant === "purple") return [0.85, 0.68, 1.0];
    return [0.62, 0.86, 1.0];
  }, [variant]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // ✅ 只在瀏覽器執行
        if (typeof window === "undefined") return;

        // 動態載入，避免 Next build 時在 server 執行
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { VRM, VRMUtils, VRMLoaderPlugin } = await import("@pixiv/three-vrm");

        const loader = new GLTFLoader();
        loader.crossOrigin = "anonymous";

        // ✅ three-vrm 推薦用 plugin
        loader.register((parser) => new VRMLoaderPlugin(parser));

        const gltf = await loader.loadAsync(url);
        if (cancelled) return;

        const vrm = gltf.userData.vrm;
        if (!vrm) throw new Error("VRM parse failed: gltf.userData.vrm not found");

        // ✅ 修正 VRM 方向 / 骨架等（官方建議）
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // 有些 VRM 會需要這個來對齊 0 度姿勢
        // 如果你發現模型方向怪，再保留這行（通常是正向幫助）
        VRMUtils.rotateVRM0(vrm);

        // ===== 自動比例修正：高度目標約 1.55（你也可改成 1.4~1.7）=====
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        const height = Math.max(0.0001, size.y);
        const targetHeight = 1.55;
        const s = targetHeight / height;

        vrm.scene.scale.setScalar(s);

        // 重新算一次縮放後 box
        const box2 = new THREE.Box3().setFromObject(vrm.scene);
        const center = new THREE.Vector3();
        box2.getCenter(center);

        // 讓模型「站在地面」：把最低點貼近 y=0
        const minY = box2.min.y;
        vrm.scene.position.y += -minY;

        // 讓模型左右/前後置中
        vrm.scene.position.x += -center.x;
        vrm.scene.position.z += -center.z;

        // 交給 useFrame 每幀 update
        vrmHolderRef.current = vrm;

        // 放到 group 裡
        if (rootRef.current) {
          // 清空舊的（熱更新/重載）
          while (rootRef.current.children.length) rootRef.current.remove(rootRef.current.children[0]);
          rootRef.current.add(vrm.scene);
        }

        setReady(true);
      } catch (err) {
        console.error("[Avatar3D] load error:", err);
        setReady(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      // 清理：把 VRM scene 拿掉
      if (rootRef.current) {
        while (rootRef.current.children.length) rootRef.current.remove(rootRef.current.children[0]);
      }
      vrmHolderRef.current = null;
    };
  }, [url]);

  useFrame((state, delta) => {
    const vrm = vrmHolderRef.current;
    if (!vrm) return;

    // 每幀更新 VRM（表情/骨架/視線等都靠這個）
    vrm.update(delta);

    // ===== 外層拖曳旋轉（身體轉向）=====
    if (rootRef.current) {
      rootRef.current.rotation.y = previewYaw * 1.0; // 你外面 yaw 已經是弧度概念就 1.0
    }

    // ===== 輕微待機（呼吸 + 微擺）=====
    const t = state.clock.getElapsedTime();

    // 呼吸強度：不同 emotion 可調
    const breathe =
      emotion === "thinking" ? 0.012 :
      emotion === "happy" ? 0.018 :
      0.01;

    const sway =
      emotion === "thinking" ? 0.02 :
      emotion === "happy" ? 0.03 :
      0.018;

    // 用 humanoid 骨頭做更「像人」的微動（VRM 通用）
    const humanoid = vrm.humanoid;
    const chest = humanoid?.getNormalizedBoneNode("chest");
    const spine = humanoid?.getNormalizedBoneNode("spine");
    const head = humanoid?.getNormalizedBoneNode("head");

    if (chest) chest.position.y = Math.sin(t * 2.0) * breathe;
    if (spine) spine.rotation.z = Math.sin(t * 1.3) * sway * 0.12;
    if (head) head.rotation.z = Math.sin(t * 1.6) * sway * 0.08;

    // 你之後要做「看向使用者」：就控制 head.rotation.y / lookAt
    // 先保守不加，以免某些 VRM 頭部骨骼命名不一致造成怪相
  });

  // 如果還沒 ready，就顯示一個很輕的 placeholder（避免黑洞感）
  if (!ready) {
    return (
      <group>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.25, 18, 18]} />
          <meshStandardMaterial color={`rgb(${Math.floor(tint[0] * 255)},${Math.floor(tint[1] * 255)},${Math.floor(tint[2] * 255)})`} transparent opacity={0.35} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <capsuleGeometry args={[0.22, 0.55, 8, 16]} />
          <meshStandardMaterial color={`rgb(${Math.floor(tint[0] * 255)},${Math.floor(tint[1] * 255)},${Math.floor(tint[2] * 255)})`} transparent opacity={0.25} />
        </mesh>
      </group>
    );
  }

  return <group ref={rootRef} />;
}
