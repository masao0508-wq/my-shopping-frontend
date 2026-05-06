import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = "https://shopping-app-8egl.onrender.com";

  const generateMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate`, { method: 'POST' });
      const json = await res.json();
      setData(json);
    } catch (e) {
      alert("エラーが発生しました。Renderが起動するまで1分ほど待ってから再度お試しください。");
    }
    setLoading(false);
  };

  const improveMenu = async () => {
    if (!data) return;
    try {
      const res = await fetch(`${API_URL}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu: data.menu })
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      alert("改善に失敗しました。");
    }
  };

  const cardStyle = {
    background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "none"
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700" }}>献立くん</h1>

      <button onClick={generateMenu} style={{
        width: "100%", padding: "16px", borderRadius: "12px", background: "#007AFF",
        color: "white", fontSize: "16px", fontWeight: "600", border: "none", marginBottom: "20px"
      }}>
        {loading ? "作成中..." : "1週間の献立を作成"}
      </button>

      {data && (
        <>
          <div style={cardStyle}>
            <div style={{ color: "#8e8e93", fontSize: "14px" }}>栄養バランス</div>
            <div style={{ fontSize: "24px", fontWeight: "700" }}>{data.score} / 10</div>
          </div>

          {data.alerts.map((a, i) => (
            <div key={i} style={{ background: "#ff3b30", color: "white", padding: "12px", borderRadius: "12px", marginBottom: "12px" }}>
              ⚠️ {a.message}
            </div>
          ))}

          {data.alerts.length > 0 && (
            <button onClick={improveMenu} style={{
              width: "100%", padding: "12px", borderRadius: "12px", background: "#34c759",
              color: "white", fontWeight: "600", border: "none", marginBottom: "20px"
            }}>
              ワンタップで魚料理を追加
            </button>
          )}

          <h2 style={{ fontSize: "20px" }}>献立リスト</h2>
          {data.menu.map((m, i) => (
            <div key={i} style={cardStyle}>
              <strong>{["月", "火", "水", "木", "金", "土", "日"][i]}曜日: {m.name}</strong>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;