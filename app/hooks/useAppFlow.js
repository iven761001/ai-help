"use client";
import { useState, useEffect } from "react";
import { storage } from "../utils/storage";

export function useAppFlow() {
  const [step, setStep] = useState("boot");
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null);
  const [finalCharacter, setFinalCharacter] = useState(null);
  
  // 動畫與狀態控制旗標
  const [flags, setFlags] = useState({
    isClient: false,
    isUnlocked: false,
    isModelReady: false,
    isApproaching: false,
  });

  // 初始化：讀取存檔
  useEffect(() => {
    setFlags(prev => ({ ...prev, isClient: true }));
    const saved = storage.load();
    if (saved && saved.email) {
      // 舊版資料相容性處理
      if (saved.model === "C1") saved.model = "avatar_01";
      if (saved.model === "C2") saved.model = "avatar_02";
      
      setFinalCharacter(saved);
      setStep("chat");
      setFlags(prev => ({ ...prev, isUnlocked: true }));
    }
  }, []);

  // Actions (功能函數)
  const actions = {
    completeBoot: () => setStep("email"),
    
    submitEmail: (inputEmail) => {
      setEmail(inputEmail);
      setStep("extracting");
    },
    
    modelReady: () => {
      if (step === "extracting") {
        setTimeout(() => setStep("create"), 1500);
      }
      setFlags(prev => ({ ...prev, isModelReady: true }));
    },
    
    updateTempConfig: (config) => setTempConfig(config),
    
    finishCreation: () => {
      try {
        const configToSave = tempConfig || { model: "avatar_01", personality: "warm" };
        const newCharacter = { 
          email, 
          name: "My AI Buddy", 
          ...configToSave, 
          createdAt: new Date().toISOString() 
        };
        
        storage.save(newCharacter);
        setFinalCharacter(newCharacter);
        
        setFlags(prev => ({ ...prev, isApproaching: true, isUnlocked: true }));

        setTimeout(() => {
          setStep("chat");
          setFlags(prev => ({ ...prev, isApproaching: false }));
        }, 2000);
      } catch (error) {
        alert("System Error: " + error.message);
      }
    },
    
    resetSystem: () => {
      if (confirm("確定要重置系統嗎？所有記憶將被清除。")) {
        storage.clear();
        setFinalCharacter(null);
        setEmail("");
        setStep("boot");
        setFlags({
          isClient: true,
          isUnlocked: false,
          isModelReady: false,
          isApproaching: false
        });
      }
    }
  };

  // 為了 3D 模型顯示計算出的衍生資料
  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "avatar_01") 
    : (finalCharacter?.model || "avatar_01");
    
  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' ? 'neutral' : 'happy';

  return {
    step,
    finalCharacter,
    flags,
    modelData: { id: currentModelId, emotion: currentEmotion },
    actions
  };
}
