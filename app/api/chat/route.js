// app/api/chat/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const message = (body?.message || "").trim();
    const nickname = body?.nickname || "小管家";

    // 1. 如果沒內容
    if (!message) {
      return NextResponse.json({ 
        reply: "妳剛剛好像沒打內容～再輸入一次我再幫妳～", 
        emotion: "confused" 
      });
    }

    // 2. 模擬 AI 思考時間 (0.8秒)
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 3. 簡單的回覆邏輯
    let reply = "";
    let emotion = "neutral";

    if (message.includes("你好") || message.includes("嗨")) {
      reply = `哈囉！我是${nickname}，很高興見到妳！有什麼我可以幫妳的嗎？✨`;
      emotion = "happy";
    } else if (message.includes("玻璃") || message.includes("水垢")) {
      reply = "浴室玻璃的水垢真的很煩人對吧？😫 建議可以使用檸檬酸或是專用的玻璃清潔劑，效果會很好喔！需不需要我推薦幾款？";
      emotion = "thoughtful";
    } else if (message.includes("生氣") || message.includes("討厭")) {
      reply = "別氣別氣～發生什麼事了？說出來心裡會舒服一點喔 ❤️";
      emotion = "sad";
    } else {
      reply = `${nickname} 收到妳說的：「${message}」\n但我目前還在學習中，可能需要妳說得更具體一點，我才能幫妳解決清潔/鍍膜的問題喔！💪`;
      emotion = "neutral";
    }

    // 4. 回傳
    return NextResponse.json({ reply, emotion });

  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json(
      { reply: "系統有點忙碌，大腦打結了...稍後再試一次看看～ 😵", emotion: "sad" },
      { status: 500 }
    );
  }
}
