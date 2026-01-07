// app/api/chat/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // 1. 嘗試解析資料
    const body = await req.json();
    const message = (body?.message || "").trim();
    
    // 接收前端傳來的角色設定，如果沒有就用預設值
    const nickname = body?.character?.name || "AI 夥伴";
    const voice = body?.character?.voice || "cute";
    const personality = body?.character?.personality || "warm";

    // 2. 檢查空訊息
    if (!message) {
      return NextResponse.json({ 
        reply: "（聽不太清楚...）妳剛剛好像沒說話耶？再試一次看看？", 
        emotion: "confused" 
      });
    }

    // 3. 簡單的關鍵字邏輯 (這裡未來會換成 OpenAI)
    let replyText = "";
    let emotion = "idle";

    if (message.includes("你好") || message.includes("嗨")) {
      replyText = `嗨嗨！我是${nickname}！終於見到妳了～(開心)`;
      emotion = "happy";
    } else if (message.includes("水垢") || message.includes("髒")) {
      replyText = "說到水垢真的很討厭對吧！如果是浴室玻璃，我建議用檸檬酸濕敷看看喔！";
      emotion = "angry"; // 假裝對髒污生氣
    } else {
      // 根據個性 (personality) 給出不同的回應風格
      if (personality === "cool") {
        replyText = `收到，關於「${message}」這件事，我記錄下來了。`;
        emotion = "neutral";
      } else if (personality === "energetic") {
        replyText = `沒問題！「${message}」是吧？交給我處理！(握拳)`;
        emotion = "happy";
      } else {
        // 預設 warm
        replyText = `嗯嗯，我聽到了～妳剛剛說「${message}」，我們可以一起研究看看喔！`;
        emotion = "happy";
      }
    }

    // 4. 回傳結果
    return NextResponse.json({
      reply: replyText,
      emotion: emotion
    });

  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json(
      { reply: "系統大腦運轉過熱...請稍後再試一次 (500)", emotion: "sad" },
      { status: 500 }
    );
  }
}
