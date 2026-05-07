import React, { useState } from 'react';

function App() {
  // --- ステート定義 ---
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("ロピア");
  const [stock, setStock] = useState("");
  const [mustUse, setMustUse] = useState(""); // 必須食材
  const [needsLunch, setNeedsLunch] = useState([]);
  const [fridgeList, setFridgeList] = useState([]); // 冷蔵庫にあるものリスト
  const [rejectedMenus, setRejectedMenus] = useState([]); // 却下リスト

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 献立生成ロジック ---
  const generateMenu = async (isRetry = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store,
          stock: stock.split(",").map(s => s.trim()),
          must_use: mustUse,
          needs_lunch: needsLunch,
          use_bento: true,
          rejected_menus: isRetry ? rejectedMenus : []
        })
      });
      
      const json = await res.json();
      if (!json || json.error) throw new Error(json?.message || json?.error || "生成に失敗しました");

      // 各メニューに表示制御用のステータスを付与
      const menuWithStatus = json.menu.map(m => ({ 
        ...m, 
        status: "OK",
        isNextDay: false,
        isLunchTarget: false
      }));
      setData({ ...json, menu: menuWithStatus });
    } catch (e) {
      alert("エラー: " + e.message);
    }
    setLoading(false);
  };

  // --- ボタン操作ロジック ---
  const handleNG = (index) => {
    const rejectedName = data.menu[index].name;
    setRejectedMenus(prev => [...prev, rejectedName]);
    alert(`${rejectedName}を却下しました。再生成します。`);
    generateMenu(true);
  };

  const adjustVolume = (index, type) => {
    const newMenu = [...data.menu];
    if (type === 'next' && index < 6) {
      // 翌日のメニューを今日のコピーにする
      newMenu[index + 1] = { ...newMenu[index], day: newMenu[index + 1].day };
    }
    setData({ ...data, menu: newMenu });
    alert("材料の購入予定量を調整しました（リストに反映されます）");
  };

  const handleCheckItem = (index) => {
    const item = data.shopping_list[index];
    setFridgeList(prev => [...prev, `${item.item} (${item.amount}${item.unit || ''})`]);
    const newList = data.shopping_list.filter((_, i) => i !== index);
    setData({ ...data, shopping_list: newList });
  };

  const cardStyle = {
    background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif", color: "#1c1c1e" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>献立くん Pro +</h1>

      {/* 設定エリア */}
      <div style={cardStyle}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "5px" }}>🌟 必須食材（たけのこ等）</label>
          <input type="text" value={mustUse} onChange={(e) => setMustUse(e.target.value)} placeholder="例：たけのこ" 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #c6c6c8", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "5px" }}>在庫食材</label>
          <input type="text" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="豚肉, キャベツ..." 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #c6c6c8", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "5px" }}>買い物先</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["ロピア", "業務スーパー"].map(s => (
              <button key={s} onClick={() => setStore(s)} style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                background: store === s ? "#007AFF" : "#e5e5ea", color: store === s ? "white" : "#3a3a3c"
              }}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => generateMenu(false)} disabled={loading} style={{
        width: "100%", padding: "18px", borderRadius: "12px", background: "#007AFF",
        color: "white", fontSize: "18px", fontWeight: "700", border: "none", marginBottom: "20px", opacity: loading ? 0.6 : 1
      }}>
        {loading ? "AIが4人分を計算中..." : "献立とリストを作成"}
      </button>

      {data && (
        <>
          <div style={{ ...cardStyle, background: "#fff9c4" }}>
            <div style={{ fontWeight: "700", fontSize: "18px" }}>📊 スコア: {data.score}/10</div>
            <div style={{ fontSize: "14px", marginTop: "5px", color: "#555" }}>💡 {data.usage_tips}</div>
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "20px 0 10px" }}>1週間の献立（奥様チェック）</h2>
          {data.menu.map((m, i) => (
            <div key={i} style={{ ...cardStyle, borderLeft: "8px solid #34c759" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "14px", color: "#8e8e93" }}>{m.day}曜日 {m.is_easy && "✨手抜き"}</span>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>
                    <a href={m.recipe_url} target="_blank" rel="noreferrer" style={{ color: "#007AFF", textDecoration: "none" }}>{m.name} 🔗</a>
                  </div>
                </div>
                <button onClick={() => handleNG(i)} style={{
                  padding: "8px 16px", borderRadius: "20px", border: "none",
                  background: "#ff3b30", color: "white", fontWeight: "600"
                }}>NG</button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => adjustVolume(i, 'next')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", background: "none", color: "#007AFF", fontSize: "12px" }}>翌日分も作る</button>
                <button onClick={() => adjustVolume(i, 'lunch')} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #34c759", background: "none", color: "#34c759", fontSize: "12px" }}>昼に回す</button>
              </div>

              <div style={{ marginTop: "10px", fontSize: "13px", color: "#48484a", background: "#f8f8f8", padding: "8px", borderRadius: "8px" }}>
                🍱 <b>弁当:</b> {m.bento_tip}<br/>
                🍖 <b>10代向け:</b> {m.volume_tip}
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "20px 0 10px" }}>🛒 買い物チェックリスト</h2>
          <div style={cardStyle}>
            {data.shopping_list.map((item, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #e5e5ea", display: "flex", alignItems: "center" }}>
                <input type="checkbox" onChange={() => handleCheckItem(i)} style={{ marginRight: "10px", transform: "scale(1.2)" }} />
                <span>{item.item} : {item.amount}{item.unit}</span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "20px 0 10px" }}>❄️ 冷蔵庫にあるもの</h2>
          <div style={{ ...cardStyle, background: "#e1f5fe" }}>
            {fridgeList.length > 0 ? fridgeList.map((f, i) => (
              <div key={i} style={{ padding: "5px 0" }}>✅ {f}</div>
            )) : <div style={{ color: "#8e8e93" }}>チェックした食材がここに表示されます</div>}
          </div>
        </>
      )}
    </div>
  );
}
// App.js のステートに以下を追加
const [volumeAdjustments, setVolumeAdjustments] = useState({}); // { 0: 2, 1: 1.5 } のような形式

// adjustVolume 関数を修正
const adjustVolume = (index, type) => {
  const multiplier = type === 'next' ? 2 : 1.5;
  setVolumeAdjustments(prev => ({ ...prev, [index]: multiplier }));
  
  const newMenu = [...data.menu];
  if (type === 'next' && index < 6) {
    newMenu[index + 1] = { ...newMenu[index], day: newMenu[index + 1].day };
  }
  setData({ ...data, menu: newMenu });
  
  // 分量を反映させるために自動で再計算を走らせる
  alert("分量を計算し直します。");
  generateMenu(false); 
};

// generateMenu 内の body に volumeAdjustments を含める
// body: JSON.stringify({ ..., volume_adjustments: volumeAdjustments })
export default App;
