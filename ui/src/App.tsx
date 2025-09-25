import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Fade from "./components/ui/Fade";
import Button from "./components/ui/Button";
import Spinner from "./components/ui/Spinner";
import "./index.css";

/** Flask 側のURL */
const SERVER_URL = "http://127.0.0.1:5000";

/** {{ key || default }} 展開 */
function renderWithTokens(text: string, mapping: Record<string, string>) {
  return text.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\|\s*(.+?))?\s*\}\}/g,
    (_m, key, deflt) => {
      const v = mapping[key];
      return v !== undefined && v !== null && v !== "" ? v : (deflt || "");
    }
  );
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
function formatJP(y?: string, m?: string, d?: string, s?: string, e?: string) {
  if (!y || !m || !d || !s || !e) return "";
  const Y = +y, M = +m, D = +d;
  const dt = new Date(Y, M - 1, D);
  if (isNaN(dt.getTime())) return "";
  return `${Y}年${M}月${D}日（${WEEK[dt.getDay()]}） ${s.slice(0, 5)}-${e.slice(0, 5)}`;
}

/* ====== 小さなUI ====== */
const LabeledInput = ({
  label, value, onChange, placeholder, type = "text"
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: "text" | "number" }) => (
  <Fade type="fadeUp" className="mb-4">
    <label className="block text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white"
    />
  </Fade>
);

const LabeledTextArea = ({
  label, value, onChange, rows = 4
}: { label: string; value: string; onChange: (v: string) => void; rows?: number }) => (
  <Fade type="fadeUp" className="mb-4">
    <label className="block text-gray-700 mb-1">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white"
    />
  </Fade>
);

const LabeledYesNo = ({
  label, value, onChange
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <Fade type="fadeUp" className="mb-4">
    <label className="block text-gray-700 mb-1">{label}</label>
    <select
      className="w-full px-3 py-2 border rounded-lg bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">選択してください</option>
      <option value="はい">はい</option>
      <option value="いいえ">いいえ</option>
    </select>
  </Fade>
);

type FormState = Record<string, string>;

/* ====== 日時ピッカー ====== */
const DateTimePicker = ({
  year, month, day, timeStart, timeEnd, onChange
}: {
  year: string; month: string; day: string; timeStart: string; timeEnd: string;
  onChange: (p: Partial<Record<string, string>>) => void;
}) => {
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];

  const lastDay = React.useMemo(
    () => new Date(parseInt(year || `${years[0]}`), parseInt(month || "1"), 0).getDate(),
    [year, month]
  );

  useEffect(() => {
    if (!year) onChange({ year: `${years[0]}` });
    if (!month) onChange({ month: `${now.getMonth() + 1}` });
    if (!day) onChange({ day: `${now.getDate()}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fade type="fadeUp" className="mb-4">
      <label className="block text-gray-700 mb-1">日時（自動で曜日計算）</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select className="px-3 py-2 border rounded-lg bg-white" value={year}
          onChange={(e) => onChange({ year: e.target.value })}>
          {years.map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg bg-white" value={month}
          onChange={(e) => onChange({ month: e.target.value })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg bg-white" value={day}
          onChange={(e) => onChange({ day: e.target.value })}>
          {Array.from({ length: lastDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}日</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="time" className="px-3 py-2 border rounded-lg bg-white"
          value={timeStart} onChange={(e) => onChange({ timeStart: e.target.value })} />
        <input type="time" className="px-3 py-2 border rounded-lg bg-white"
          value={timeEnd} onChange={(e) => onChange({ timeEnd: e.target.value })} />
      </div>
      <div className="text-xs text-gray-500 mt-1">例：2025年9月22日（月） 15:00-19:00</div>
    </Fade>
  );
};

/* ====== 項目定義（テンプレ全反映・セクション分け） ====== */
const SECTIONS: Array<{
  title: string;
  items: Array<{ key: string; label: string; type: "text" | "textarea" | "number" | "yesno" }>;
}> = [
  {
    title: "基本情報",
    items: [
      { key: "title", label: "事業名", type: "text" },
      { key: "club", label: "実施クラブ", type: "text" },
      { key: "dept", label: "実施部署", type: "text" },
      { key: "category", label: "活動カテゴリ", type: "text" },
      { key: "field", label: "活動分野", type: "text" },
      // datetime は日時ピッカーで生成
      { key: "place", label: "活動場所", type: "text" },
      { key: "expected_ivusa", label: "想定人数（IVUSA）", type: "number" },
      { key: "expected_other", label: "想定人数（他）", type: "number" },
      { key: "owner", label: "事業責任者", type: "text" },
      { key: "other_club", label: "他クラブ参加", type: "text" },
      { key: "beneficiary", label: "受益者", type: "text" },
      { key: "is_new", label: "新規事業かどうか", type: "yesno" },
      { key: "activity_kind", label: "活動内容の種類", type: "text" },
      { key: "duration", label: "活動期間", type: "text" },
    ],
  },
  {
    title: "目的・要件・内容",
    items: [
      { key: "skills", label: "活動で必要とされるもの（得られるもの）", type: "textarea" },
      { key: "purpose", label: "目的", type: "textarea" },
      { key: "kpi", label: "達成要件", type: "textarea" },
      { key: "details", label: "内容", type: "textarea" },
    ],
  },
  {
    title: "スケジュール",
    items: [
      { key: "pre_schedule", label: "事業実施までのスケジュール", type: "textarea" },
      { key: "exec_schedule", label: "計画実行のためのスケジュール", type: "textarea" },
      { key: "day_schedule", label: "当日の作戦計画（スケジュール）", type: "textarea" },
    ],
  },
  {
    title: "リスク・関係機関",
    items: [
      { key: "risk_before", label: "事前のリスクヘッジ", type: "textarea" },
      { key: "risk_during", label: "事中のリスクヘッジ", type: "textarea" },
      { key: "stakeholders", label: "関係機関・カウンターパート等", type: "textarea" },
      { key: "permit_city", label: "役所への申請など", type: "text" },
      { key: "permit_fire", label: "消防署への申請など", type: "text" },
      { key: "permit_police", label: "警察への申請など", type: "text" },
      { key: "other_notes", label: "その他（備考）", type: "textarea" },
    ],
  },
  {
    title: "予算・資金",
    items: [
      { key: "budget_total", label: "予算総額（円）", type: "number" },
      { key: "funding", label: "資金調達方法", type: "textarea" },
      { key: "budget_usage", label: "予算用途", type: "textarea" },
    ],
  },
  {
    title: "各種フラグ",
    items: [
      { key: "press", label: "プレスリリース", type: "yesno" },
      { key: "drive_student", label: "学生運転", type: "yesno" },
      { key: "rentacar", label: "レンタカー利用", type: "yesno" },
      { key: "general_join", label: "一般参加", type: "yesno" },
      { key: "knife", label: "刃物使用", type: "yesno" },
      { key: "power_tool", label: "動力機材使用", type: "yesno" },
      { key: "self_cook", label: "自炊", type: "yesno" },
      { key: "stay", label: "宿泊利用", type: "yesno" },
    ],
  },
  {
    title: "緊急連絡体制",
    items: [
      { key: "emg_clubman", label: "緊急連絡先：クラマネ", type: "text" },
      { key: "emg_officer", label: "緊急連絡先：担当役員", type: "text" },
      { key: "emg_day", label: "緊急連絡先：当日責任者", type: "text" },
      { key: "emg_ok", label: "緊急連絡体制は明確？", type: "yesno" },
    ],
  },
];

/* ====== アプリ本体 ====== */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState("");

  // 既定の初期値
  const [form, setForm] = useState<FormState>({
    // 日時系
    year: "", month: "", day: "", timeStart: "09:00", timeEnd: "17:00",
    datetime: "",

    // よく使う基本
    title: "", club: "京都衣笠クラブ", dept: "", category: "", field: "", place: "",

    // 以降テンプレ項目
    expected_ivusa: "", expected_other: "", owner: "", other_club: "", beneficiary: "",
    is_new: "", activity_kind: "", duration: "", skills: "",
    purpose: "", kpi: "", details: "", pre_schedule: "", exec_schedule: "", day_schedule: "",
    risk_before: "", risk_during: "", stakeholders: "",
    permit_city: "", permit_fire: "", permit_police: "", other_notes: "",
    budget_total: "", funding: "", budget_usage: "",
    press: "", drive_student: "", rentacar: "", general_join: "", knife: "", power_tool: "", self_cook: "", stay: "",
    emg_clubman: "", emg_officer: "", emg_day: "", emg_ok: "",
  });

  // テンプレ取得
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${SERVER_URL}/template`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (d.ok) setRaw(d.template_text || "");
      } catch (e) {
        console.error("template fetch error:", e);
        setRaw("（テンプレートの取得に失敗しました）");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // datetime の自動生成
  const datetime = useMemo(
    () => formatJP(form.year, form.month, form.day, form.timeStart, form.timeEnd),
    [form.year, form.month, form.day, form.timeStart, form.timeEnd]
  );

  // マッピング
  const mapping = useMemo(() => ({ ...form, datetime }), [form, datetime]);

  // 変更ヘルパ
  const update = (p: Partial<FormState>) =>
    setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])) }));

  const saveLocal = () => localStorage.setItem("kikasu_form", JSON.stringify(form));
  const loadLocal = () => { const s = localStorage.getItem("kikasu_form"); if (s) setForm(JSON.parse(s)); };
  const resetAll = () => setForm(prev => {
    const n: FormState = {}; for (const k of Object.keys(prev)) n[k] = "";
    n.timeStart = "09:00"; n.timeEnd = "17:00"; n.club = "京都衣笠クラブ"; return n;
  });

  const generateDocx = async () => {
    const res = await fetch(`${SERVER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, formatted_datetime: datetime }),
    });
    if (!res.ok) return alert("DOCX生成に失敗しました");
    const data = await res.json();
    if (data.download_url) window.open(`${SERVER_URL}${data.download_url}`, "_blank");
    else alert("生成成功（outputフォルダを確認）");
  };

  // アイテム型を抽出
  type FieldItem = (typeof SECTIONS)[number]["items"][number];

  // 項目レンダリング
  const renderField = (cfg: FieldItem) => {
    const v = form[cfg.key] ?? "";
    const set = (val: string) => update({ [cfg.key]: val });

    switch (cfg.type) {
      case "textarea":
        return <LabeledTextArea key={cfg.key} label={cfg.label} value={v} onChange={set} rows={5} />;
      case "number":
        return <LabeledInput key={cfg.key} label={cfg.label} value={v} onChange={set} type="number" />;
      case "yesno":
        return <LabeledYesNo key={cfg.key} label={cfg.label} value={v} onChange={set} />;
      default:
        return <LabeledInput key={cfg.key} label={cfg.label} value={v} onChange={set} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-blue-700">企画書エディタ</div>
          <div className="text-xs text-gray-500">銀行アプリ風フェード</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左：フォーム */}
        <section className="bg-white rounded-2xl shadow-sm border p-6">
          <Fade type="fade" className="text-sm font-semibold text-gray-600 tracking-wider uppercase mb-2">
            入力
          </Fade>

          {/* 日時ピッカー */}
          <DateTimePicker
            year={form.year} month={form.month} day={form.day}
            timeStart={form.timeStart} timeEnd={form.timeEnd}
            onChange={update}
          />

        {/* ====== セクションごとに展開（datetime は除外） ====== */}
        {SECTIONS.map(section => (
          <div key={section.title} className="mt-6">
            <Fade type="fade" className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
              {section.title}
            </Fade>

            {section.items
              .filter(f => f.key !== "datetime")
              .map(f => {
                const v = form[f.key] ?? "";
                const set = (val: string) => update({ [f.key]: val });

                if (f.type === "textarea") return (
                  <LabeledTextArea key={f.key} label={f.label} value={v} onChange={set} rows={5} />
                );
                if (f.type === "number") return (
                  <LabeledInput key={f.key} label={f.label} value={v} onChange={set} type="number" />
                );
                if (f.type === "yesno") return (
                  <LabeledYesNo key={f.key} label={f.label} value={v} onChange={set} />
                );
                return <LabeledInput key={f.key} label={f.label} value={v} onChange={set} />;
              })}
          </div>
        ))}


          {/* 操作ボタン */}
          <div className="mt-4 flex gap-2">
            <Button onClick={saveLocal}>一時保存</Button>
            <Button className="bg-gray-700 hover:bg-gray-800" onClick={loadLocal}>読み込み</Button>
            <Button className="bg-gray-400 hover:bg-gray-500" onClick={resetAll}>クリア</Button>
            <div className="ml-auto">
              <Button onClick={generateDocx}>DOCX出力</Button>
            </div>
          </div>
        </section>

        {/* 右：プレビュー */}
        <section className="bg-white rounded-2xl shadow-sm border p-6">
          <Fade type="fade" className="text-sm font-semibold text-gray-600 tracking-wider uppercase mb-2">
            プレビュー（テンプレ全文）
          </Fade>

          {loading ? (
            <div className="py-8"><Spinner /></div>
          ) : (
            <AnimatePresence mode="wait">
              <Fade key={JSON.stringify(mapping)} type="fade" className="prose max-w-none whitespace-pre-wrap leading-relaxed">
                {renderWithTokens(raw, mapping).replace(/\t/g, "　　")}
              </Fade>
            </AnimatePresence>
          )}
        </section>
      </main>
    </div>
  );
}