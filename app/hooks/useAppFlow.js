"use client";
import { useState, useEffect } from "react";
import { storage } from "../utils/storage";

export function useAppFlow() {
  const [step, setStep] = useState("boot");
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null);
  const [finalCharacter, setFinalCharacter] = useState(null);
  
  const [flags, setFlags] = useState({
    isClient: false,
    isUnlocked: false,
    isModelReady: false,
    isApproaching: false,
  });

  // 初始化讀取存檔
  useEffect(() => {
    setFlags(prev => ({ ...prev, isClient: true }));
    const saved = storage.load();
    if (saved && saved.email) {
      if (["avatar_01", "model_c", "C1"].includes(saved.model)) saved.model = "core_main";
      if (["avatar_02", "model_si", "C2"].includes(saved.model)) saved.model = "core_sec";
      
      setFinalCharacter(saved);
      setStep("chat");
      setFlags(prev => ({ ...prev, isUnlocked: true }));
    }
  }, []);

  // 🌟 新增：安全計時器 (Safety Timer)
  // 如果在 'extracting' 畫面卡超過 6 秒，不管模型好沒好，強制進入 'create'
  useEffect(() => {
    if (step === "extracting") {
      const timer = setTimeout(() => {
        console.warn("⚠️ Model load timeout - Forcing transition...");
        setStep("create");
        setFlags(prev => ({ ...prev, isModelReady: true })); 
      }, 6000); // 6秒後強制跳轉

      return () => clearTimeout(timer);
    }
  }, [step]);

  const actions = {
    completeBoot: () => setStep("email"),
    submitEmail: (inputEmail) => {
      setEmail(inputEmail);
      setStep("extracting");
    },
    
    // 正常的模型載入成功回調
    modelReady: () => {
      if (step === "extracting") {
        setTimeout(() => setStep("create"), 1500);
      }
      setFlags(prev => ({ ...prev, isModelReady: true }));
    },
    
    updateTempConfig: (config) => setTempConfig(config),
    
    finishCreation: () => {
      try {
        const configToSave = tempConfig || { model: "core_main", personality: "warm" };
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
    },

    // 🌟 計算當前 ID (預設 core_main)
    currentModelId: step === 'create' 
      ? (tempConfig?.model || "core_main") 
      : (finalCharacter?.model || "core_main"),
      
    currentEmotion: (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' ? 'neutral' : 'happy'
  };

  // 整理回傳物件
  return {
    step,
    finalCharacter,
    flags,
    modelData: { 
        id: actions.currentModelId, 
        emotion: actions.currentEmotion 
    },
    actions
  };
}
