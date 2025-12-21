export async function POST(req) {
  try {
    const body = await req.json();
    const msg = String(body?.message || "");
    const nickname = String(body?.nickname || "小管家");

    let emotion = "idle";
    const lower = msg.toLowerCase();
    if (lower.includes("謝") || lower.includes("thanks")) emotion = "happy";
    else if (lower.includes("?") || msg.includes("嗎") || msg.includes("怎麼")) emotion = "thinking";
    else if (lower.includes("抱歉") || msg.includes("不好意思")) emotion = "sorry";

    const reply =
      `（示範回覆）\n` +
      `我收到你的訊息了：${msg}\n\n` +
      `之後我會用更像「${nickname}」的口氣回答你，並且帶情緒互動。`;

    return Response.json({ reply, emotion });
  } catch (e) {
    return Response.json(
      { reply: "系統忙碌中，稍後再試一次～", emotion: "sorry" },
      { status: 200 }
    );
  }
}
