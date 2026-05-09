import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [store, setStore] = useState("ロピア");

  const API_URL = "https://shopping-app-8egl.onrender.com";

  // 1. アプリ起動時の設定
  useEffect(() => {
    document.title = "Kon-Date"; // ブラウザのタブ名を変更
    const saved = localStorage.getItem('kon_date_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // 2. 履歴保存（重複防止）
  const saveToHistory = (newData) => {
    if (!newData || !newData.menu) return;
    setHistory(prev => {
      const isDuplicate = prev.some(h => h.id === newData.id);
      if (isDuplicate) return prev;
      const updated = [newData, ...prev].slice(0, 10);
      localStorage.setItem('kon_date_history', JSON.stringify(updated));
      return updated;
    });
  };

  // 3. 分量計算
  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList]);

  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: [], rejected_menus: [] })
      });
      const json = await res.json();
      if (json.menu) {
        const newEntry = { ...json, id: new Date().getTime(), timestamp: new Date().toLocaleString('ja-JP'), savedStore: store };
        setData(newEntry);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
        saveToHistory(newEntry);
      }
    } catch (e) { alert("生成失敗"); }
    setLoading(false);
  };

  const syncWithAI = async (updatedMenu, updatedAdjustments, rejected = []) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store,
          stock: data?.stock || [],
          rejected_menus: rejected,
          current_menu_names: updatedMenu.map(m => ({ day: m.day, main: m.main.name, side: m.side.name }))
        })
      });
      const json = await res.json();
      if (json.menu) {
        setBaseShoppingList(json.shopping_list || []);
        const updatedEntry = { ...json, menu: updatedMenu, id: data.id, timestamp: data.timestamp, savedStore: store };
        setData(updatedEntry);
        setVolumeAdjustments(updatedAdjustments);
        setHistory(prev => {
          const newHist = prev.map(h => h.id === data.id ? updatedEntry : h);
          localStorage.setItem('kon_date_history', JSON.stringify(newHist));
          return newHist;
        });
      }
    } catch (e) { alert("更新エラー"); }
    setLoading(false);
  };

  const moveItem = (index, fromStock) => {
    if (fromStock) {
      const itemStr = data.stock[index];
      const match = itemStr.match(/(.+) \(([\d.]+)(.+)\)/);
      const restored = match ? { item: match[1], amount: parseFloat(match[2]), unit: match[3] } : { item: itemStr, amount: 1, unit: "個" };
      setBaseShoppingList([...baseShoppingList, restored]);
      setData({ ...data, stock: data.stock.filter((_, i) => i !== index) });
    } else {
      const item = data.shopping_list[index];
      const newStock = [...(data.stock || []), `${item.item} (${item.amount}${item.unit})`];
      setBaseShoppingList(baseShoppingList.filter((_, i) => i !== index));
      setData({ ...data, stock: newStock });
    }
  };

  const loadFromHistory = (item) => {
    setData(item);
    setBaseShoppingList(item.shopping_list || []);
    setStore(item.savedStore || "ロピア");
    setShowHistory(false);
  };

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "900", color: "#FF3B30", marginBottom: "20px" }}>Kon-Date</h1>

      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", background: "#8e8e93", color: "white", border: "none", borderRadius: "10px", marginBottom: "15px", fontSize: "13px" }}>
        {showHistory ? "▲ 履歴を閉じる" : "🕒 過去の献立履歴"}
      </button>

      {showHistory && (
        <div style={{ background: "white", borderRadius: "12px", padding: "10px", marginBottom: "20px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
          {history.map((h, idx) => (
            <div key={idx} onClick={() => loadFromHistory(h)} style={{ padding: "12px", borderBottom: "1px solid #eee", fontSize: "13px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>{h.timestamp}</span><span style={{ color: "#007AFF" }}>{h.savedStore} ＞</span>
            </div>
          ))}
          {history.length === 0 && <p style={{ textAlign: "center", fontSize: "12px", color: "#8e8e93" }}>履歴なし</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {["ロピア", "業務スーパー"].map(s => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "12px", background: store === s ? "#FF3B30" : "#e5e5ea", color: store === s ? "white" : "#8e8e93", border: "none", borderRadius: "10px", fontWeight: "bold" }}>{s}</button>
        ))}
      </div>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", fontSize: "16px", marginBottom: "20px" }}>
        献立を作成する
      </button>

      {data?.usage_tips && (
        <div style={{ background: "#fff9db", padding: "12px", borderRadius: "12px", marginBottom: "15px", fontSize: "13px", border: "1px solid #ffeeba" }}>
          🍎 <b>Kon-Date バランス診断 (Score: {data.score}):</b><br/>{data.usage_tips}
        </div>
      )}

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "white", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8e8e93", marginBottom: "8px" }}>
            <span>{m.day}曜日</span><span style={{ color: "#ff9500" }}>{m.type}</span>
          </div>
          <div style={{ borderLeft: "4px solid #007AFF", paddingLeft: "12px", marginBottom: "10px" }}>
             <div style={{ display: "flex", justifyContent: "space-between" }}>
               <span style={{ fontSize: "16px", fontWeight: "bold" }} onClick={() => setSelectedRecipe(m.main)}>{m.main.name}</span>
               <button onClick={() => syncWithAI(data.menu, volumeAdjustments, [m.main.name])} style={{ color: "red", border: "none", background: "none", fontSize: "12px" }}>✖ NG</button>
             </div>
          </div>
          <div style={{ borderLeft: "4px solid #34c759", paddingLeft: "12px" }}>
             <div style={{ display: "flex", justifyContent: "space-between" }}>
               <span style={{ fontSize: "14px" }} onClick={() => setSelectedRecipe(m.side)}>{m.side.name}</span>
               <button onClick={() => syncWithAI(data.menu, volumeAdjustments, [m.side.name])} style={{ color: "red", border: "none", background: "none", fontSize: "12px" }}>✖ NG</button>
             </div>
          </div>
        </div>
      ))}

      <div style={{ background: "white", borderRadius: "16px", padding: "16px", border: "1px solid #34c759", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "14px", color: "#34c759", margin: "0 0 10px 0" }}>🥦 在庫（チェックで買い物へ）</h3>
        {data?.stock?.map((s, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
            <input type="checkbox" checked onChange={() => moveItem(idx, true)} style={{ width: "20px", height: "20px", marginRight: "10px" }} />
            <span style={{ fontSize: "13px" }}>{s}</span>
          </div>
        ))}
      </div>

      {data?.shopping_list?.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "16px", border: "2px solid #007AFF" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} style={{ width: "22px", height: "22px", marginRight: "12px" }} />
              <span style={{ fontSize: "15px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "20px", width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", background: "#FF3B30", color: "white", border: "none", borderRadius: "10px", marginTop: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, fontWeight: "bold", color: "#FF3B30" }}>Kon-Date AI 計算中...</div>}
    </div>
  );
}

export default App;
