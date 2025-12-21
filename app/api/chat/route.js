// app/api/chat/route.js
export async function POST(req) {
  try {
    const body = await req.json();
    const message = (body?.message || "").trim();
    const nickname = body?.nickname || "小管家";
    const voice = body?.voice || "warm";

    if (!message) {
      return Response.json({ reply: "你剛剛好像沒打內容～再輸入一次我再幫你～", emotion: "idle" });
    }

    // 很簡單的示範：用關鍵字回覆（你之後會換成真正 LLM）
    const isQuestion = message.includes("？") || message.includes("?") || message.length > 8;

    const voiceHint =
      voice === "calm"
        ? "我用條理方式跟你說："
        : voice === "energetic"
        ? "我來快速跟你說重點："
        : "我用比較溫暖的方式跟你說：";

    const reply = isQuestion
      ? `${voiceHint}\n\n我收到「${message}」。\n\n目前這個 API 先用示範回覆，下一步我可以幫你接上真正的 AI（OpenAI 或你指定的後端），讓${nickname}能完整回答鍍膜/清潔問題。`
      : `${nickname} 收到～你剛剛說「${message}」對吧？\n\n你可以再補充一下你遇到的材質（玻璃/不鏽鋼/石材）跟狀況（油垢/水垢/霉斑），我會比較精準。`;

    return Response.json({
      reply,
      emotion: "idle"
    });
  } catch (e) {
    return Response.json(
      { reply: "現在系統有點忙碌，稍後再試一次看看～", emotion: "idle" },
      { status: 500 }
    );
  }
}
