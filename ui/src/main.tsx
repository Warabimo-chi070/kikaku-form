import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence } from "framer-motion";
import Fade from "./components/ui/Fade";
import Button from "./components/ui/Button";
import Spinner from "./components/ui/Spinner";
import "./index.css";

/* ===== 設定 ===== */
const SERVER_URL = "http://127.0.0.1:5000";

/* ===== ユーティリティ ===== */
function renderWithTokens(text: string, mapping: Record<string, string>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\|\s*(.+?))?\s*\}\}/g,
    (_m, key, deflt) => {
      const v = mapping[key];
      return v !== undefined && v !== null && v !== "" ? v : (deflt || "");
    });
}
const WEEK = ["日","月","火","水","木","金","土"];
function formatJP(y?: string, m?: string, d?: string, s?: string, e?: string) {
  if (!y||!m||!d||!s||!e) return "";
  const Y=+y, M=+m, D=+d; const dt = new Date(Y, M-1, D);
  if (isNaN(dt.getTime())) return "";
  return `${Y}年${M}月${D}日（${WEEK[dt.getDay()]}） ${s.slice(0,5)}-${e.slice(0,5)}`;
}

/* ===== 小さなUI ===== */
const LabeledInput = ({label, value, onChange, placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}) => (
  <Fade type="fadeUp" className="mb-4">
    <label className="block text-gray-700 mb-1">{label}</label>
    <input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white"/>
  </Fade>
);

const LabeledTextArea = ({label, value, onChange, rows=4}:{label:string;value:string;onChange:(v:string)=>void;rows?:number}) => (
  <Fade type="fadeUp" className="mb-4">
    <label className="block text-gray-700 mb-1">{label}</label>
    <textarea value={value} onChange={(e)=>onChange(e.target.value)} rows={rows}
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white"/>
  </Fade>
);

type FormState = Record<string,string>;

const DateTimePicker = ({year,month,day,timeStart,timeEnd,onChange}:{year:string;month:string;day:string;timeStart:string;timeEnd:string;onChange:(p:Partial<Record<string,string>>)=>void})=>{
  const now=new Date(); const years=[now.getFullYear(), now.getFullYear()+1, now.getFullYear()+2];
  const lastDay=useMemo(()=>new Date(parseInt(year||`${years[0]}`), parseInt(month||"1"), 0).getDate(),[year,month]);
  useEffect(()=>{ if(!year) onChange({year:`${years[0]}`}); if(!month) onChange({month:`${now.getMonth()+1}`}); if(!day) onChange({day:`${now.getDate()}`}); },[]);
  return (
    <Fade type="fadeUp" className="mb-4">
      <label className="block text-gray-700 mb-1">日時（自動で曜日計算）</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select className="px-3 py-2 border rounded-lg bg-white" value={year} onChange={e=>onChange({year:e.target.value})}>{years.map(y=><option key={y} value={y}>{y}年</option>)}</select>
        <select className="px-3 py-2 border rounded-lg bg-white" value={month} onChange={e=>onChange({month:e.target.value})}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}</select>
        <select className="px-3 py-2 border rounded-lg bg-white" value={day} onChange={e=>onChange({day:e.target.value})}>{Array.from({length:lastDay},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}日</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="time" className="px-3 py-2 border rounded-lg bg-white" value={timeStart} onChange={e=>onChange({timeStart:e.target.value})}/>
        <input type="time" className="px-3 py-2 border rounded-lg bg-white" value={timeEnd}   onChange={e=>onChange({timeEnd:e.target.value})}/>
      </div>
      <div className="text-xs text-gray-500 mt-1">例：2025年9月22日（月） 15:00-19:00</div>
    </Fade>
  );
};

const App: React.FC = () => {
  const [loading,setLoading]=useState(true);
  const [raw,setRaw]=useState("");
  const [form,setForm]=useState<FormState>({
    title:"", purpose:"", kpi:"",
    year:"", month:"", day:"", timeStart:"09:00", timeEnd:"17:00",
    club:"京都衣笠クラブ", dept:"", place:"",
  });

  useEffect(()=>{
    fetch(`${SERVER_URL}/template`).then(r=>r.json()).then(d=>{ if(d.ok) setRaw(d.template_text||""); }).finally(()=>setLoading(false));
  },[]);

  const datetime = useMemo(()=>formatJP(form.year,form.month,form.day,form.timeStart,form.timeEnd),
    [form.year,form.month,form.day,form.timeStart,form.timeEnd]);

  const mapping = useMemo(()=>({ ...form, datetime }),[form, datetime]);

  const update = (patch: Partial<FormState>) =>
    setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(patch).map(([k,v])=>[k, v??""])) }));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-blue-700">衣笠クラブ 企画書エディター</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左：フォーム */}
        <section className="bg-white rounded-2xl shadow-sm border p-6">
          <Fade type="fade" className="text-sm font-semibold text-gray-600 tracking-wider uppercase mb-2">入力</Fade>

          <LabeledInput label="事業名" value={form.title} onChange={v=>update({title:v})}/>
          <LabeledInput label="実施クラブ" value={form.club} onChange={v=>update({club:v})}/>
          <LabeledInput label="実施部署" value={form.dept} onChange={v=>update({dept:v})}/>
          <LabeledInput label="活動場所" value={form.place} onChange={v=>update({place:v})}/>

          <DateTimePicker year={form.year} month={form.month} day={form.day} timeStart={form.timeStart} timeEnd={form.timeEnd} onChange={update}/>

          <LabeledTextArea label="目的" value={form.purpose} onChange={v=>update({purpose:v})}/>
          <LabeledTextArea label="達成要件" value={form.kpi} onChange={v=>update({kpi:v})}/>

          <div className="mt-4 flex gap-2">
            <Button onClick={()=>localStorage.setItem("kikasu_form", JSON.stringify(form))}>一時保存</Button>
            <Button className="bg-gray-700 hover:bg-gray-800" onClick={()=>{ const s=localStorage.getItem("kikasu_form"); if(s) setForm(JSON.parse(s)); }}>読み込み</Button>
            <Button className="bg-gray-400 hover:bg-gray-500"
              onClick={()=>setForm(p=>{ const n:FormState={}; for(const k of Object.keys(p)) n[k]=""; n.timeStart="09:00"; n.timeEnd="17:00"; n.club="京都衣笠クラブ"; return n; })}
            >クリア</Button>
            <div className="ml-auto">
              <Button onClick={async ()=>{
                const res = await fetch(`${SERVER_URL}/generate`, {
                  method:"POST", headers:{"Content-Type":"application/json"},
                  body: JSON.stringify({ ...form, formatted_datetime: datetime })
                });
                if(!res.ok) return alert("DOCX生成に失敗しました");
                const data = await res.json();
                if(data.download_url) window.open(`${SERVER_URL}${data.download_url}`, "_blank");
                else alert("生成成功（outputフォルダを確認）");
              }}>
                DOCX出力
              </Button>
            </div>
          </div>
        </section>

        {/* 右：プレビュー */}
        <section className="bg-white rounded-2xl shadow-sm border p-6">
          <Fade type="fade" className="text-sm font-semibold text-gray-600 tracking-wider uppercase mb-2">プレビュー（テンプレ全文）</Fade>
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
};

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root が見つかりません");
createRoot(rootEl).render(<App />);
