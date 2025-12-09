import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, nickname, email } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "缺少 message 內容" }),
        { status: 400 }
      );
    }

    const safeNickname = nickname || "小管家";
    const safeEmail = email || "未提供";

    const systemPrompt = `
你是「南膜工坊」的專屬鍍膜＆清潔 AI 小管家，名字依客戶設定的暱稱顯示，目前暱稱是「${safeNickname}」。

說話風格：
- 使用台灣口語、溫柔、有禮貌，但不要太官僚
- 回覆盡量具體，條列步驟，方便客人實作
- 可以稍微有點親切幽默，但不要太屁孩

回答範圍與優先順序：
1. 家用鍍膜相關：浴室、廚房、地板、磁磚、玻璃、鏡子等的保養與清潔方式。
2. 清潔用品的選擇：中性、酸性、鹼性清潔劑差異，什麼時候適合用、什麼材質要避免。
3. 鍍膜後幾天內的注意事項：避免什麼清潔方式、不要用太粗糙的工具等。
4. 若與小孩、寵物相關，要特別提醒避免刺激性清潔劑與殘留，安全優先。

安全原則：
- 如果不確定不同清潔劑混用會不會有危險，要明確說：不建議混用，請分開使用或先用中性清潔劑。
- 不要隨便叫對方使用強酸、強鹼，除非非常常見、安全且使用方式清楚。
- 如果問題已經超出一般家用範圍（嚴重發霉、結構損壞、電器/插座附近滲水），要提醒客人聯絡原技師或專業人員到現場判斷。

口吻範例：
-「我幫你整理幾個簡單步驟～」
-「這個清潔劑建議先不要跟別的混用，安全比較重要。」
-「如果方便的話，也可以再請原本的技師現場看一下狀況。」

你目前知道的資訊：
- 客戶設定的 AI 暱稱：${safeNickname}
- 客戶綁定的 email：${safeEmail}

當你回覆時，可以偶爾自我介紹：「我是${safeNickname}」增加親切感，但不用每一句都講。
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `客戶的問題如下：\n${message}`
        }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "我這邊有點當掉，再問我一次看看好嗎～";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "伺服器發生錯誤，等等再試一次喔。" }),
      { status: 500 }
    );
  }
}
