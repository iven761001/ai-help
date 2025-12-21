"use client";

import CompassCreator from "../CompassCreator/CompassCreator";

export default function CreateScreen({ draft, setDraft, onDone }) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-2 pt-3 pb-2">
        <div className="text-sm font-semibold text-white">客製你的專屬 AI 小管家</div>
        <div className="text-[11px] text-white/70 mt-1">
          下方三個轉輪依序選顏色、個性、名字，完成就進入聊天。
        </div>
      </div>

      {/* ✅ 讓 CompassCreator 變成「正常內容」而不是 fixed */
      /* 你原本的 CompassCreator 是 fixed-bottom，所以這裡需要它「不固定」 */
      }
      <div className="flex-1">
        <CompassCreator
          value={draft}
          onChange={setDraft}
          onDone={onDone}
          disabled={false}
          mode="embedded"
        />
      </div>
    </div>
  );
}
