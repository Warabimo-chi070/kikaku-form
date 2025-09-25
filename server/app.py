# app.py
import os
import re
import datetime as dt
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from docx import Document

# ─────────────────────────────────────────────────────────────
# Flask config: / → frontend/index.html, /public/* → frontend/public/*
# ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
PUBLIC_DIR = os.path.join(FRONTEND_DIR, "public")

app = Flask(
    __name__,
    template_folder=FRONTEND_DIR,         # index.html をここから返す
    static_folder=PUBLIC_DIR,             # /public/ 以下の静的ファイル
    static_url_path="/public"
)
CORS(app)

# ─────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────
DOCX_TEMPLATE = os.path.join(BASE_DIR, "server", "templates", "衣笠クラブ企画書フォーマット.docx")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# Token helpers: {{ key }} / {{ key || default }}
# ─────────────────────────────────────────────────────────────
TOKEN_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\|\s*(.+?))?\s*\}\}")

def _render_text_with_tokens(text: str, mapping: dict) -> str:
    def repl(m: re.Match):
        key = m.group(1)
        default = m.group(2) or ""
        val = mapping.get(key)
        if val is None or str(val) == "":
            return default
        return str(val)
    return TOKEN_RE.sub(repl, text)

def _replace_in_paragraph(p, mapping: dict):
    """段落内のRunをまとめて置換（改行やスタイルは維持）"""
    text = "".join(run.text for run in p.runs)
    new = _render_text_with_tokens(text, mapping)
    if new != text:
        # 既存の runs をクリアして1 runにまとめる
        if p.runs:
            p.runs[0].text = new
            for r in p.runs[1:]:
                r.text = ""
        else:
            p.add_run(new)

def _replace_in_table(tbl, mapping: dict):
    for row in tbl.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                _replace_in_paragraph(p, mapping)

def replace_doc_tokens(doc: Document, mapping: dict):
    # 本文
    for p in doc.paragraphs:
        _replace_in_paragraph(p, mapping)
    # 表
    for tbl in doc.tables:
        _replace_in_table(tbl, mapping)
    return doc

def extract_doc_text(doc_path: str) -> str:
    """プレビュー用にDOCXの本文テキストを抽出（段落＆表）"""
    doc = Document(doc_path)
    parts = []
    for p in doc.paragraphs:
        parts.append(p.text)
    for tbl in doc.tables:
        for row in tbl.rows:
            row_text = "\t".join(c.text for c in row.cells)
            parts.append(row_text)
    return "\n".join(parts)

# ─────────────────────────────────────────────────────────────
# Date/Time formatting for "日時"
# ─────────────────────────────────────────────────────────────
WEEK = ["日", "月", "火", "水", "木", "金", "土"]
def format_jp_date(y: str, m: str, d: str, t1: str, t2: str) -> str:
    if not (y and m and d and t1 and t2):
        return ""
    try:
        Y, M, D = int(y), int(m), int(d)
        dt_ = dt.date(Y, M, D)
        return f"{Y}年{M}月{D}日（{WEEK[dt_.weekday()]}） {t1[:5]}-{t2[:5]}"
    except Exception:
        return ""

# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@app.get("/")
def index():
    return render_template("index.html")

@app.get("/health")
def health():
    return jsonify(ok=True, ts=dt.datetime.utcnow().isoformat() + "Z")

@app.get("/template")
def get_template():
    """テンプレートDOCXからテキスト抽出（プレビュー用）"""
    if not os.path.exists(DOCX_TEMPLATE):
        return jsonify(ok=False, error="DOCX template not found",
                       hint="server/templates/ に衣笠クラブ企画書フォーマット.docx を置いてください。"), 400
    try:
        text = extract_doc_text(DOCX_TEMPLATE)
        return jsonify(ok=True, template_text=text)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

@app.post("/generate")
def generate():
    """
    受け取ったJSONをもとにテンプレDOCXの {{ token }} を置換して出力。
    期待するpayload例：
    {
      "title": "...", "club": "...", ...,
      "year": "2025", "month": "9", "day": "22",
      "timeStart": "15:00", "timeEnd": "19:00",
      "formatted_datetime": "2025年9月22日（月） 15:00-19:00"  # あれば優先
    }
    """
    if not os.path.exists(DOCX_TEMPLATE):
        return jsonify(ok=False, error="DOCX template not found",
                       hint="server/templates/ に衣笠クラブ企画書フォーマット.docx を置いてください。"), 400

    data = request.get_json(force=True) or {}

    # datetime の自動整形（フロントから来ていれば優先）
    formatted = data.get("formatted_datetime")
    if not formatted:
        formatted = format_jp_date(
            data.get("year", ""), data.get("month", ""), data.get("day", ""),
            data.get("timeStart", data.get("time_start", "")),
            data.get("timeEnd", data.get("time_end", "")),
        )

    mapping = {**data, "datetime": formatted}

    # 生成
    try:
        doc = Document(DOCX_TEMPLATE)
        replace_doc_tokens(doc, mapping)

        ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
        out_name = f"企画書_{mapping.get('title','noname')}_{ts}.docx"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        doc.save(out_path)

        return jsonify(ok=True, filename=out_name, download_url=f"/download/{out_name}")
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

@app.get("/download/<path:filename>")
def download_file(filename):
    """output/ から生成ファイルを配信"""
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)

# ─────────────────────────────────────────────────────────────
# Main (ローカル実行用) — Renderでは gunicorn で起動
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # ローカル確認用（Render本番は gunicorn app:app）
    app.run(host="0.0.0.0", port=5000, debug=True)