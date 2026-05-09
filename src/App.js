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
    document.title = "Kon-Date";
    const saved = localStorage.getItem('kon_date_stable_final');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (newData) => {
    if (!newData || !newData.id) return;
    setHistory(prev => {
      const updated = [newData, ...prev.filter(h => h.id !== newData.id)].slice(0, 10);
      localStorage.setItem('kon_date_stable_final', JSON.stringify(updated));
      return updated;
    });
  };

  // 生成メイン関数
  const generateFullMenu = async (currentRejected = []) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, rejected_menus: currentRejected })
      });
      const json = await res.json();
      if (json && json.menu) {
        const newEntry = { ...json, id: Date.now(), timestamp: new Date().toLocaleString('ja-JP'), savedStore: store, stock: [] };
        setData(newEntry);
        saveToHistory(newEntry);
      }
    } catch (e) { alert("サーバーとの通信に失敗しました。"); }
    setLoading(false);
  };

  // 数量調整ロジック（買い物リストへの反映と翌日メニューの書き換え）
  const handleVolumeChange = (idx, type) => {
    const newData = JSON.parse(JSON.stringify(data));
    const targetMenu = newData.menu[idx];
    
    // 加算倍率の設定
    let multiplier = 0;
    if (type === 'next') {
      multiplier = 1.0; 
      targetMenu.isNextDayMade = true;
      if (idx < 6) {
        // 翌日の材料分をリストから引くためのフラグ
        const originalNextMenu = newData.menu[idx+1];
        if (originalNextMenu.type !== "前日の残り") {
          updateShoppingList(newData, originalNextMenu, -1.0); // 翌日の元の材料を減算
        }
        newData.menu[idx+1].main = { ...targetMenu.main };
        newData.menu[idx+1].side = { ...targetMenu.side };
        newData.menu[idx+1].type = "前日の残り";
      }
    } else if (type === 'lunch') {
      multiplier = 0.5;
      targetMenu.showLunch = true;
    }

    updateShoppingList(newData, targetMenu, multiplier);
    setData(newData);
    saveToHistory(newData);
  };

  // 買い物リストの数値を動的に更新するサブ関数
  const updateShoppingList = (dataObj, menuDay, multiplier) => {
    const recipeText = `${menuDay.main.recipe}\n${menuDay.side.recipe}${menuDay.showLunch ? '\n'+menuDay.lunch.recipe : ''}`;
    const lines = recipeText.split('\n');
    lines.forEach(line => {
      const match = line.match(/[-・]\s*([^:：\s]+)\s*[:：\s]*([\d.]+)\s*(\w+)/);
      if (match) {
        const [_, name, amount, unit] = match;
        const target = dataObj.shopping_list.find(i => i.item === name);
        if (target) {
          target.amount = Math.round((target.amount + (parseFloat(amount) * multiplier)) * 10) / 10;
        } else if (multiplier > 0) {
          dataObj.shopping_list.push({ item: name, amount: parseFloat(amount) * multiplier, unit: unit });
        }
      }
    });
  };

  // 在庫・買い物リストの双方向移動
  const moveItem = (index, fromStock) => {
    const newData = { ...data };
    if (fromStock) {
      const itemStr = newData.stock[index];
      const match = itemStr.match(/(.+) \(([\d.]+)(.+)\)/);
      const restored = match ? { item: match[1], amount: parseFloat(match[2]), unit: match[3] } : { item: itemStr, amount: 1, unit: "個" };
      newData.shopping_list.push(restored);
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
    <div style={{ background: "#f2f2f7", minHeight: "100vh", padding: "15px", fontFamily: "-apple-system, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#FF3B30" }}>Kon-Date</h1>
      
      <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", padding: "10px", background: "#8e8e93", color: "white", border: "none", borderRadius: "10px", marginBottom: "10px" }}>🕒 履歴を表示</button>

      {showHistory && (
        <div style={{ background: "white", borderRadius: "12px", padding: "10px", marginBottom: "15px" }}>
          {history.map(h => (
            <div key={h.id} onClick={() => { setData(h); setShowHistory(false); }} style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
              <span>{h.timestamp}</span><span>{h.savedStore} ＞</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
        {["ロピア", "業務スーパー"].map(s => (
          <button key={s} onClick={() => setStore(s)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: store === s ? "#FF3B30" : "#fff", color: store === s ? "#fff" : "#000" }}>{s}</button>
        ))}
      </div>

      <button onClick={() => generateFullMenu()} style={{ width: "100%", padding: "16px", background: "#34c759", color: "white", border: "none", borderRadius: "14px", fontWeight: "bold" }}>1週間の献立を作成</button>

      {data?.menu?.map((m, i) => (
        <div key={i} style={{ background: "white", borderRadius: "15px", padding: "15px", marginTop: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: "12px", color: "#8e8e93" }}>{m.day}曜日 ({m.type})</div>
            <button onClick={() => { const next = [...rejectedMenus, m.main.name]; setRejectedMenus(next); generateFullMenu(next); }} style={{ color: "#FF3B30", border: "none", background: "none", fontSize: "12px" }}>✖ NG</button>
          </div>
          <div onClick={() => setSelectedRecipe(m.main)} style={{ fontWeight: "bold", fontSize: "16px", textDecoration: "underline", cursor: "pointer" }}>{m.main.name}</div>
          <div onClick={() => setSelectedRecipe(m.side)} style={{ fontSize: "14px", textDecoration: "underline", cursor: "pointer", color: "#3a3a3c" }}>{m.side.name}</div>
          {m.showLunch && <div style={{ color: "#007AFF", fontSize: "12px", marginTop: "5px" }}>🍱 昼: {m.lunch?.name}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            {i < 6 && m.type !== "前日の残り" && <button onClick={() => handleVolumeChange(i, 'next')} style={{ flex: 1, fontSize: "10px", padding: "8px", borderRadius: "8px", border: "1px solid #007AFF", color: "#007AFF", background: "none" }}>翌日分も作る</button>}
            <button onClick={() => handleVolumeChange(i, 'lunch')} style={{ flex: 1, fontSize: "10px", padding: "8px", borderRadius: "8px", border: "1px solid #34c759", color: "#34c759", background: "none" }}>昼ごはん追加</button>
          </div>
        </div>
      ))}

      {data?.stock?.length > 0 && (
        <div style={{ marginTop: "20px", background: "#e5e5ea", padding: "15px", borderRadius: "15px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "15px" }}>🥦 冷蔵庫の在庫（タップで買い物リストへ）</h3>
          {data.stock.map((item, idx) => (
            <div key={idx} onClick={() => moveItem(idx, true)} style={{ display: "flex", alignItems: "center", padding: "5px 0", cursor: "pointer" }}>
              <div style={{ color: "#8e8e93", textDecoration: "line-through" }}>✓ {item}</div>
            </div>
          ))}
        </div>
      )}

      {data?.shopping_list && (
        <div style={{ marginTop: "20px", background: "white", padding: "15px", borderRadius: "15px", border: "2px solid #007AFF" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#007AFF", fontSize: "15px" }}>🛒 買い物リスト ({store})</h3>
          {data.shopping_list.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
              <input type="checkbox" onChange={() => moveItem(idx, false)} style={{ width: "20px", height: "20px" }} />
              <span style={{ marginLeft: "10px" }}>{item.item} : {item.amount}{item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSelectedRecipe(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "20px", width: "85%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3>{selectedRecipe.name}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{selectedRecipe.recipe}</p>
            <button onClick={() => setSelectedRecipe(null)} style={{ width: "100%", padding: "12px", background: "#FF3B30", color: "white", border: "none", borderRadius: "10px" }}>閉じる</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #FF3B30", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
          <p style={{ marginTop: "15px", color: "#FF3B30", fontWeight: "bold" }}>Kon-Date AI 計算中...</p>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default App;
