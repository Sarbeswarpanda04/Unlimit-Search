import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise RuntimeError("GROQ_API_KEY is missing. Set it in .env or environment variables.")

model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
base_url = (os.getenv("GROQ_BASE_URL") or "").strip().rstrip("/")
if base_url.endswith("/openai/v1"):
    base_url = base_url[: -len("/openai/v1")]

if base_url:
    client = Groq(api_key=api_key, base_url=base_url)
else:
    client = Groq(api_key=api_key)

app = Flask(__name__)
CORS(app)


@app.post("/ai-search")
def ai_search():
    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or "").strip()
    if not query:
        return jsonify({"error": "query is required"}), 400

    completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"Answer this search query clearly and concisely: {query}",
            }
        ],
        model=model,
    )

    answer = (completion.choices[0].message.content or "").strip()
    return jsonify({"answer": answer})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
