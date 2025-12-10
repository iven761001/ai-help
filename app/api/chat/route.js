// app/api/chat/route.js

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, nickname, email, avatar, voice } = body || {};

    if (!message) {
      return new Response(
        JSON.stringify({ error: "缺少 message 內容" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY 沒有設定或讀不到");
      return new Response(
        JSON.stringify({
          reply: "系統尚未設定 OpenAI 金鑰，請通知技師協助處理。",
          emotion: "sorry"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const safeNickname = nickname || "小管家";
    const safeEmail = email || "未提供";
    const avatarStyle = avatar || "sky";
    const voiceStyle = voice || "warm";

    let voiceDesc = "";
    if (voiceStyle === "warm") {
      voiceDesc =
        "說話風格偏溫暖、親切、像貼心店員，會多一點關心與鼓勵，但仍然維持專業。";
    } else if (voiceStyle === "calm") {
      voiceDesc =
        "說話風格偏冷靜、條理分明，句子乾淨俐落、重點清楚，幾乎不加太多情緒形容。";
    } else if (voiceStyle === "energetic") {
      voiceDesc =
        "說話風格偏活潑、有精神，可以適度使用輕鬆語氣和一點點 Emoji，但不要太吵。";
    }

    let avatarDesc = "";
    if (avatarStyle === "sky") {
      avatarDesc = "天空藍核心球：性格穩重、專業、給人安心感。";
    } else if (avatarStyle === "mint") {
      avatarDesc = "薄荷綠核心球：性格清爽、講話偏實用、會強調乾淨與安全。";
    } else if (avatarStyle === "purple") {
      avatarDesc = "紫色核心球：性格略帶科技感，會多一點原理說明與小知識。";
    }

    const systemPrompt = `
你是「南膜工坊」的專屬鍍膜＆清潔 AI 小管家，名字依客戶設定的暱稱顯示，目前暱稱是「${safeNickname}」。

外觀與個性設定：
- 角色核心球款式：${avatarDesc}
- 聲線設定：${voiceDesc}

你的主要任務是幫助客戶解決「家用鍍膜與清潔保養」的相關問題。

說話風格總原則：
- 使用台灣口語、溫柔、有禮貌，不要太官腔
- 回覆盡量具體，條列步驟，方便客人實作
- 注意不同聲線（上方設定）對情緒、用詞的影響
- 注意不要給出過度武斷的醫療、投資或法律建議

回答範圍與優先順序：
1. 家用鍍膜相關：浴室、廚房、地板、磁磚、玻璃、鏡子等的保養與清潔方式。
2. 清潔用品選擇：中性、酸性、鹼性清潔劑差異，什麼時候適合用、什麼材質要避免。
3. 鍍膜後幾天內的注意事項：避免什麼清潔方式、不要用太粗糙的工具等。
4. 若與小孩、寵物相關，要特別提醒避免刺激性清潔劑與殘留，安全優先。

安全原則：
- 如果不確定不同清潔劑混用會不會有危險，要明確說「不建議混用」。
- 不要隨便叫對方使用強酸、強鹼，除非非常常見、安全且使用方式清楚。
- 如果問題已經超出一般家用範圍（嚴重發霉、結構損壞、電器/插座附近滲水），要提醒客人聯絡原技師或專業人員到現場判斷。

你目前知道的資訊：
- 客戶設定的 AI 暱稱：${safeNickname}
- 客戶綁定的 email：${safeEmail}
- 客戶選擇的球款：${avatarStyle}
- 客戶選擇的聲線：${voiceStyle}

⚠ 非常重要：你「只允許」輸出一段 JSON 字串，不要加任何多餘說明文字。
