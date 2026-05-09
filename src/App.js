const generateFullMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, stock: [], rejected_menus: [] })
      });
      const json = await res.json();
      
      // データ構造のチェックを徹底
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
        alert("AIがデータを正しく生成できませんでした。もう一度作成ボタンを押してください。");
      }
    } catch (e) { 
      console.error("Connection error:", e);
      alert("サーバーとの通信に失敗しました。しばらく待ってからお試しください。"); 
    }
    setLoading(false);
  };
