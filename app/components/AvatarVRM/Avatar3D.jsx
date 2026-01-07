// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// Pose helper
function applyNaturalPose(vrm) {
  if (!vrm || !vrm.humanoid) return;
  const rotateBone = (name, x, y, z) => {
    const bone = vrm.humanoid.getNormalizedBoneNode(name);
    if (bone) bone.rotation.set(x, y, z);
  };
  rotateBone('leftUpperArm',  0, 0, 1.3);
  rotateBone('rightUpperArm', 0, 0, -1.3);
  rotateBone('leftLowerArm',  0, 0, 0.1);
  rotateBone('rightLowerArm', 0, 0, -0.1);
  rotateBone('leftHand', 0, 0, 0.1);
  rotateBone('rightHand', 0, 0, -0.1);
}

// The Visual Ring that moves up
function ScannerRing({ y, visible }) {
  if (!visible) return null;
  return (
    <group position={[0, y, 0]}>
      {/* Bright Ring */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      {/* Glow effect */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  
  // 1. Create the Clipping Plane
  // Plane(normal, constant). Normal (0, -1, 0) means "show things below this plane".
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  // Animation References
  const scanY = useRef(0);
  const targetY = 2.0;

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    applyNaturalPose(loadedVrm);

    // 2. Apply Materials ONLY ONCE (for performance)
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        
        // Save original material
        if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

        // Apply Clipping Plane to ALL materials
        // This ensures the scan effect works on everything
        obj.material.clippingPlanes = [clippingPlane];
        obj.material.clipShadows = true; 
        // Important: Use double side to prevent holes during scanning
        obj.material.side = THREE.DoubleSide; 
      }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
    
    // Reset scan position
    scanY.current = 0;
    clippingPlane.constant = 0;

  }, [gltf, onReady, clippingPlane]);

  useFrame((state, delta) => {
    // Animation Logic
    if (!unlocked) {
        // Scanning Animation: Move from 0 to 2.0
        scanY.current = THREE.MathUtils.lerp(scanY.current, targetY + 0.1, delta * 0.8);
        
        // Update the Clipping Plane (Visual Reveal)
        clippingPlane.constant = scanY.current;
    } else {
        // Unlocked: Disable Clipping (Show Full Model)
        clippingPlane.constant = 100.0;
    }

    // Hologram Effect Logic (Wireframe vs Solid)
    if (vrm) {
        vrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                // Determine if it's an eye part
                const isEye = obj.name.toLowerCase().includes("eye") || obj.material.name.toLowerCase().includes("eye");
                
                if (!unlocked) {
                    // --- LOCKED STATE (Scanning) ---
                    if (!isEye) {
                        // Body becomes Blue Wireframe
                        obj.material.wireframe = true;
                        obj.material.color.setHex(0x00ffff);
                        obj.material.emissive.setHex(0x001133);
                    } else {
                        // Eyes appear only when scan reaches head level (approx 1.35m)
                        obj.visible = scanY.current > 1.35;
                        // Eyes remain solid (not wireframe) for "soul" effect
                        obj.material.wireframe = false;
                        obj.material.color.setHex(0xffffff); 
                    }
                } else {
                    // --- UNLOCKED STATE (Solid) ---
                    obj.visible = true;
                    // Restore original look
                    obj.material.wireframe = false;
                    obj.material.color.setHex(0xffffff); 
                    obj.material.emissive.setHex(0x000000); 
                }
            }
        });

        // Blinking Animation
        const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
            vrm.expressionManager.update();
        }
        vrm.update(delta);
    }
  });

  return (
    <>
      {vrm && <primitive object={vrm.scene} />}
      
      {/* Scanner Ring Visual (Only show when locked and scanning) */}
      {!unlocked && <ScannerRing y={scanY.current} visible={scanY.current < 2.0} />}
    </>
  );
}
