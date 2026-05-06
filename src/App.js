import React, { useState } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // あなたのRenderのURL
  const API_URL = "https://shopping-app-8egl.onrender.com";

  const generateMenu = async () => {
    setLoading(true);
    try {
      // Render側の「/menu_ai」という窓口を呼ぶように修正
      const res = await fetch(`${API_URL}/menu_ai`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: [], preference: "和食中心" }) 
      });
      const json = await res.json();
      // Renderの返却値に合わせて「days」というデータを取り出す
      setData(json.days);
    } catch (e) {
      alert("エラーが発生しました。Renderが起動するまで1分ほど待ってから再度お試しください。");
    }
    setLoading(false);
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
          <h2 style={{ fontSize: "20px" }}>献立リスト</h2>
          {data.map((item, i) => (
            <div key={i} style={cardStyle}>
              <strong>{item.day}: {item.menu}</strong>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;
