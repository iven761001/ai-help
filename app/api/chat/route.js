import OpenAI from "openai";
import { NextResponse } from "next/server";

// 1. 初始化 OpenAI (它會自動讀取環境變數裡的 OPENAI_API_KEY)
const openai = new OpenAI();

// 🌟 設定 AI 人設 (System Prompt) - 這裡決定她的個性
const SYSTEM_PROMPT = `
妳現在是一個叫做 "Aria" 的高科技 AI 助理。
個性設定：
1. 妳說話有點調皮，充滿活力，喜歡用 emoji ✨。
2. 妳非常專業，對於使用者的請求會給予準確的回答。
3. 妳住在一個虛擬的浮空介面中。
4. 回答請簡短有力，不要長篇大論，因為對話框空間有限。
5. 請全部用繁體中文回答。
`;

export async function POST(req) {
  try {
    const { message } = await req.json();

    // 2. 呼叫 OpenAI (ChatGPT)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // 使用最強的模型 (或是 gpt-3.5-turbo)
      messages: [
        { role: "system", content: SYSTEM_PROMPT }, // 注入人設
        { role: "user", content: message },         // 使用者的訊息
      ],
      temperature: 0.7, // 創意度 (0.7 很剛好)
      max_tokens: 150,  // 限制長度，避免廢話太多
    });

    // 3. 取得 AI 的回答
    const reply = completion.choices[0].message.content;

    // 4. 回傳給前端
    return NextResponse.json({ reply: reply });

  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json(
      { reply: "抱歉，我的線路有點壅塞... 腦袋運轉中 😵‍💫" }, 
      { status: 500 }
    );
  }
}
