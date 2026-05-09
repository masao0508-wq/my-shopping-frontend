import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [store, setStore] = useState("ロピア");
  const [rejectedMenus, setRejectedMenus] = useState([]);

  const API_URL = "https://shopping-app-8egl.onrender.com";

  useEffect(() => {
    const saved = localStorage.getItem('kon_date_stable_v100');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (newData) => {
    if (!newData || !newData.id) return;
    setHistory(prev => {
      const updated = [newData, ...prev.filter(h => h.id !== newData.id)].slice(0, 10);
      localStorage.setItem('kon_date_stable_v100', JSON.stringify(updated));
      return updated;
    });
  };

  const generateFullMenu = async (currentRejected = []) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, rejected_menus: currentRejected })
      });
      const text = await res.json();
      const json = typeof text === 'string' ? JSON.parse(text) : text;

      if (json && json.menu) {
        const newEntry = { ...json, id: Date.now(), timestamp: new Date().toLocaleString(), savedStore: store, stock: [] };
        setData(newEntry);
        saveToHistory(newEntry);
      }
    } catch (e) { alert("データ取得に失敗しました。"); }
    setLoading(false);
  };

  // 数量調整・減算ロジック
  const handleVolumeChange = (idx, type) => {
    const newData = JSON.parse(JSON.stringify(data));
    const target = newData.menu[idx];

    if (type === 'next') {
      target.isNextDayMade = true;
      if (idx < 6) {
        const originalNext = newData.menu[idx+1];
        if (originalNext.type !== "前日の残り") {
          modifyItems(newData, originalNext, -1.0); // 翌日の元の分を減算
        }
        newData.menu[idx+1] = { ...target, day: newData.menu[idx+1].day, type: "前日の残り" };
      }
      modifyItems(newData, target, 1.0); // 前日分を+1.0
    } else if (type === 'lunch') {
      target.showLunch = true;
      modifyItems(newData, {main: target.lunch, side: {recipe: ""}}, 0.5); // 昼分を+0.5
    }
    setData(newData);
    saveToHistory(newData);
  };

  const modifyItems = (dataObj, menuDay, multiplier) => {
    const recipeText = `${menuDay.main?.recipe || ""}\n${menuDay.side?.recipe || ""}`;
    recipeText.split('\n').forEach(line => {
      const match = line.match(/[-・]\s*([^:：\s]+)\s*[:：\s]*([\d.]+)\s*(\w+)/);
      if (match) {
        const [_, name, amt] = match;
        const item = dataObj.shopping_list.find(i => i.item === name);
        if (item) item.amount = Math.max(0, Math.round((item.amount + (parseFloat(amt) * multiplier)) * 10) / 10);
      }
    });
  };

  const moveItem = (index, fromStock) => {
    const newData = { ...data };
    if (fromStock) {
      const itemStr = newData.stock[index];
      newData.shopping_list.push({ item: itemStr.split(' (')[0], amount: "", unit: "" });
      newData.stock.splice(index, 1);
    } else {
      const item = newData.shopping_list[index];
      newData.stock.push(`${item.item} (${item.amount}${item.unit})`);
      newData.shopping_list.splice(index, 1);
    }
    setData(newData);
    saveToHistory(newData);
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "15px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#FF3B30" }}>Kon-Date</h1>
      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }}>🕒 履歴</button>
      {showHistory && history.map(h => (
        <div key={h.id} onClick={() => {setData(h); setShowHistory(false);}} style={{ padding: "10px", background: "#fff", marginBottom: "5px" }}>{h.timestamp} - {h.savedStore}</div>
      ))}

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {["ロピア", "業務スーパー"].map(s => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "10px", background: store === s ? "#FF3B30" : "#ccc" }}>{s}</button>
        ))}
      </div>
      <button onClick={() => generateFullMenu()} style={{ width: "100%", padding: "15px", background: "#34c759", color: "#fff", fontWeight: "bold" }}>1週間の献立を作成</button>

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "#fff", padding: "15px", marginTop: "10px", borderRadius: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>{m.day} ({m.type})</span>
            <button onClick={() => { const next = [...rejectedMenus, m.main.name]; setRejectedMenus(next); generateFullMenu(next); }} style={{ color: "#FF3B30" }}>NG</button>
          </div>
          <div onClick={() => setSelectedRecipe(m.main)} style={{ fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>{m.main.name}</div>
          <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "14px", cursor: "pointer", color: "#666" }}>{m.side.name}</div>
          {m.showLunch && <div style={{ color: "#007AFF", fontSize: "12px" }}>🍱 昼: {m.lunch?.name}</div>}
          <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
            {i < 6 && m.type !== "前日の残り" && <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, fontSize: "11px" }}>翌日分も作る</button>}
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, fontSize: "11px" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data?.stock?.length > 0 && (
        <div style={{ marginTop: "20px", background: "#ddd", padding: "10px" }}>
          <h4>🥦 冷蔵庫の在庫</h4>
          {data.stock.map((item, idx) => (
            <div key={idx} onClick={() => moveItem(idx, true)} style={{ textDecoration: "line-through" }}>✓ {item}</div>
          ))}
        </div>
      )}

      {data?.shopping_list && (
        <div style={{ marginTop: "20px", background: "#fff", padding: "15px", border: "2px solid #007AFF" }}>
          <h4>🛒 買い物リスト ({store})</h4>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ padding: "5px 0", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} /> {item.item}: {item.amount}{item.unit}
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "#fff", padding: "20px", width: "80%", borderRadius: "10px" }} onClick={e => e.stopPropagation()}>
            <h3>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p>Kon-Date AI 計算中...</p>
        </div>
      )}
    </div>
  );
}

export default App;
