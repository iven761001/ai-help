import OpenAI from "openai";
import { NextResponse } from "next/server";

// 1. 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🌟 設定 AI 人設 (System Prompt)
// 這裡跟之前一樣，可以設定妳希望她扮演的角色
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
      // 這裡可以用 "gpt-4o" (最新最快) 或 "gpt-3.5-turbo" (便宜)
      // 既然妳有付費，建議直接用最強的 gpt-4o
      model: "gpt-4o", 
      messages: [
        { role: "system", content: SYSTEM_PROMPT }, // 注入人設
        { role: "user", content: message },         // 使用者的訊息
      ],
      temperature: 0.7, // 0.7 是標準創意度，越高越有創意，越低越嚴謹
      max_tokens: 150,  // 限制回答長度，避免它講太多廢話
    });

    // 3. 取得 AI 的回答
    const reply = completion.choices[0].message.content;

    // 4. 回傳給前端
    return NextResponse.json({ reply: reply });

  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json(
      { reply: "抱歉，我的 OpenAI 線路有點壅塞... 請稍後再試 😵‍💫" }, 
      { status: 500 }
    );
  }
}
