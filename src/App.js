import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Kon-Date AI 計算中...");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [store, setStore] = useState("ロピア");

  const API_URL = "https://shopping-app-8egl.onrender.com";

  useEffect(() => {
    document.title = "Kon-Date";
    const saved = localStorage.getItem('kon_date_vfinal');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (newData) => {
    if (!newData || !newData.id) return;
    setHistory(prev => {
      if (prev.some(h => h.id === newData.id)) return prev;
      const updated = [newData, ...prev].slice(0, 10);
      localStorage.setItem('kon_date_vfinal', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList, data?.id]);

  const generateFullMenu = async () => {
    setLoading(true);
    setLoadingText("Kon-Date AI 計算中...");
    const sleepTimer = setTimeout(() => {
      setLoadingText("サーバー起動中（初回1〜2分）...");
    }, 10000);

    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: [], rejected_menus: [] })
      });
      clearTimeout(sleepTimer);
      const json = await res.json();
      
      if (json && json.menu) {
        const newEntry = { ...json, id: Date.now(), timestamp: new Date().toLocaleString('ja-JP'), savedStore: store };
        setData(newEntry);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
        saveToHistory(newEntry);
      } else {
        alert(json.message || "生成に失敗しました。");
      }
    } catch (e) { 
      clearTimeout(sleepTimer);
      alert("通信エラー。Renderがスリープ中の可能性があります。しばらく待って再試行してください。"); 
    }
    setLoading(false);
  };

  const syncWithAI = async (updatedMenu, updatedAdjustments, rejected = []) => {
    setLoading(true);
    setLoadingText("メニューを再計算しています...");
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
      if (json && json.menu) {
        setBaseShoppingList(json.shopping_list || []);
        const updatedEntry = { ...json, menu: updatedMenu, id: data.id, timestamp: data.timestamp, savedStore: store };
        setData(updatedEntry);
        setVolumeAdjustments(updatedAdjustments);
        setHistory(prev => {
          const newHist = prev.map(h => h.id === data.id ? updatedEntry : h);
          localStorage.setItem('kon_date_vfinal', JSON.stringify(newHist));
          return newHist;
        });
      }
    } catch (e) { alert("更新失敗"); }
    setLoading(false);
  };

  const handleVolumeChange = (idx, type) => {
    const newAdj = { ...volumeAdjustments };
    const newMenu = JSON.parse(JSON.stringify(data.menu));
    if (type === 'next') {
        newMenu[idx].isNextDayMade = true;
        if (idx < 6) {
            newMenu[idx+1].main = {...newMenu[idx].main};
            newMenu[idx+1].side = {...newMenu[idx].side};
            newMenu[idx+1].type = "前日の残り";
        }
        newAdj[idx] = (newAdj[idx] || 1) + 1.0;
    } else if (type === 'lunch') {
        newMenu[idx].showLunch = true;
        newAdj[idx] = (newAdj[idx] || 1) + 0.5;
    }
    syncWithAI(newMenu, newAdj);
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

  return (
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "15px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#FF3B30", fontWeight: "bold" }}>Kon-Date</h1>
      
      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", background: "#8e8e93", color: "white", border: "none", borderRadius: "10px", marginBottom: "10px", cursor: "pointer" }}>
        {showHistory ? "▲ 履歴を閉じる" : "🕒 履歴を表示"}
      </button>

      {showHistory && (
        <div style={{ background: "white", borderRadius: "12px", padding: "10px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          {history.map(h => (
            <div key={h.id} onClick={() => { setData(h); setBaseShoppingList(h.shopping_list || []); setShowHistory(false); }} style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
              <span>{h.timestamp}</span><span style={{ color: "#007AFF" }}>{h.savedStore} ＞</span>
            </div>
          ))}
          {history.length === 0 && <p style={{ textAlign: "center", fontSize: "12px", color: "#8e8e93" }}>履歴はありません</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
        {["ロピア", "業務スーパー"].map(s => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: store === s ? "#FF3B30" : "#ddd", color: "white", fontWeight: "bold" }}>{s}</button>
        ))}
      </div>

      <button onClick={generateFullMenu} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
        1週間の献立を作成
      </button>

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "white", borderRadius: "15px", padding: "15px", marginTop: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#8e8e93", marginBottom: "4px" }}>{m.day}曜日 ({m.type})</div>
          <div onClick={() => setSelectedRecipe(m.main)} style={{ fontWeight: "bold", fontSize: "16px", textDecoration: "underline", cursor: "pointer", color: "#1c1c1e" }}>{m.main.name}</div>
          <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "14px", textDecoration: "underline", cursor: "pointer", color: "#3a3a3c", marginTop: "4px" }}>{m.side.name}</div>
          {m.showLunch && <div style={{ color: "#007AFF", fontSize: "12px", marginTop: "8px", background: "#e1f5fe", padding: "5px", borderRadius: "5px" }}>🍱 昼: {m.lunch?.name}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            {i < 6 && <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, fontSize: "10px", padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "none" }}>翌日分も作る</button>}
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, fontSize: "10px", padding: "8px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", background: "none" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data?.shopping_list && (
        <div style={{ marginTop: "20px", background: "white", padding: "15px", borderRadius: "15px", border: "2px solid #007AFF" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#007AFF" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} style={{ width: "20px", height: "20px" }} />
              <span style={{ marginLeft: "10px", fontSize: "14px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "20px", width: "85%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", background: "#FF3B30", color: "white", border: "none", borderRadius: "10px", marginTop: "15px", fontWeight: "bold" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #FF3B30", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
          <p style={{ marginTop: "15px", color: "#FF3B30", fontWeight: "bold" }}>{loadingText}</p>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default App;
