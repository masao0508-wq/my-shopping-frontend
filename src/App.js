import React, { useState, useEffect } from 'react';

function App() {
  // --- 1. 変数（State）の宣言 ---
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [baseShoppingList, setBaseShoppingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [store, setStore] = useState("ロピア");

  // バックエンドのURL
  const API_URL = "https://shopping-app-8egl.onrender.com";

  // --- 2. 初期読み込み（履歴の取得） ---
  useEffect(() => {
    document.title = "Kon-Date";
    const saved = localStorage.getItem('kon_date_v3');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // --- 3. 履歴保存処理 ---
  const saveToHistory = (newData) => {
    if (!newData || !newData.id) return;
    setHistory(prev => {
      if (prev.some(h => h.id === newData.id)) return prev;
      const updated = [newData, ...prev].slice(0, 10);
      localStorage.setItem('kon_date_v3', JSON.stringify(updated));
      return updated;
    });
  };

  // --- 4. 分量計算（翌日/昼加算の連動） ---
  useEffect(() => {
    if (!data || !baseShoppingList.length) return;
    const totalMultiplier = Object.values(volumeAdjustments).reduce((a, b) => a + (b - 1), 1);
    const updatedList = baseShoppingList.map(item => ({
      ...item,
      amount: typeof item.amount === 'number' ? Math.round(item.amount * totalMultiplier * 10) / 10 : item.amount
    }));
    setData(prev => ({ ...prev, shopping_list: updatedList }));
  }, [volumeAdjustments, baseShoppingList]);

  // --- 5. AIへ献立生成をリクエストする処理（空データ対策強化版） ---
  const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: [], rejected_menus: [] })
      });
      const json = await res.json();
      
      // データが正しく生成されたかチェック
      if (json && json.menu && Array.isArray(json.menu) && json.menu.length > 0) {
        const newEntry = { 
          ...json, 
          id: Date.now(), 
          timestamp: new Date().toLocaleString('ja-JP'), 
          savedStore: store 
        };
        setData(newEntry);
        setBaseShoppingList(json.shopping_list || []);
        setVolumeAdjustments({});
        saveToHistory(newEntry);
      } else {
        console.error("Invalid data format:", json);
        alert(json.message || "AIがデータを正しく生成できませんでした。もう一度作成ボタンを押してください。");
      }
    } catch (e) { 
      console.error("Connection error:", e);
      alert("サーバーとの通信に失敗しました。しばらく待ってからお試しください。"); 
    }
    setLoading(false);
  };

  // --- 6. AIとの同期（NGボタン、ボリューム変更時） ---
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
          current_menu_names: updatedMenu.map(m => ({ 
            day: m.day, 
            main: m.main.name, 
            side: m.side.name 
          }))
        })
      });
      const json = await res.json();
      if (json && json.menu) {
        setBaseShoppingList(json.shopping_list || []);
        const updatedEntry = { 
          ...json, 
          menu: updatedMenu, 
          id: data.id, 
          timestamp: data.timestamp, 
          savedStore: store 
        };
        setData(updatedEntry);
        setVolumeAdjustments(updatedAdjustments);
        setHistory(prev => {
          const newHist = prev.map(h => h.id === data.id ? updatedEntry : h);
          localStorage.setItem('kon_date_v3', JSON.stringify(newHist));
          return newHist;
        });
      }
    } catch (e) { 
      alert("更新に失敗しました"); 
    }
    setLoading(false);
  };

  // --- 7. ボリューム変更処理（翌日・昼ごはんボタン） ---
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

  // --- 8. 在庫・買い物の移動 ---
  const moveItem = (index, fromStock) => {
    if (fromStock) {
      const itemStr = data.stock[index];
      const match = itemStr.match(/(.+) \(([\d.]+)(.+)\)/);
      const restored = match ? { item: match[1], amount: parseFloat(match[2]), unit: match
