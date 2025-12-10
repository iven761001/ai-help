// app/api/chat/route.js

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, nickname, email } = body || {};

    if (!message) {
      return new Response(
        JSON.stringify({ error: "缺少 message 內容" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // 如果沒讀到金鑰，直接回傳錯誤，方便測試
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY 沒有設定或讀不到");
      return new Response(
        JSON.stringify({
          reply: "系統尚未設定 OpenAI 金鑰，請通知技師協助處理。"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const safeNickname = nickname || "小管家";
    const safeEmail = email || "未提供";

    const systemPrompt = `
你是「南膜工坊」的專屬鍍膜＆清潔 AI 小管家，名字依客戶設定的暱稱顯示，目前暱稱是「${safeNickname}」。

說話風格：
- 使用台灣口語、溫柔、有禮貌，但不要太官腔
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

你目前知道的資訊：
- 客戶設定的 AI 暱稱：${safeNickname}
- 客戶綁定的 email：${safeEmail}

當你回覆時，可以偶爾自我介紹：「我是${safeNickname}」增加親切感，但不用每一句都講。
`.trim();

    // 直接用 fetch 呼叫 OpenAI Chat Completions API
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `客戶的問題如下：\n${message}`
          }
        ]
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("❌ OpenAI API 回應錯誤：", openaiRes.status, errText);
      return new Response(
        JSON.stringify({
          reply: "後台 AI 服務暫時有點問題，等等再試試看，或聯絡技師詢問。"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await openaiRes.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "我這邊有點當掉，再問我一次看看好嗎～";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Chat API 例外錯誤：", error);
    return new Response(
      JSON.stringify({
        reply: "伺服器這邊剛剛有點小狀況，等等再試一次看看喔～"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
