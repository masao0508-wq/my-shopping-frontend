// --- src/App.js の updateShoppingList 関数を以下に差し替え ---
const updateShoppingList = async (currentMenu, currentAdjustments) => {
  setLoading(true);
  try {
    const res = await fetch(`${API_URL}/generate_menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        store: "ロピア",
        volume_adjustments: currentAdjustments,
        // AIがメニューを勝手に変えないよう、現在のメニュー名を明示的に送る
        must_use: `現在のメニュー（${currentMenu.map(m => m.main.name).join(', ')}）を維持したまま、買い物リストの分量だけを再計算してください。`
      })
    });
    const json = await res.json();
    
    // 買い物リストが含まれている場合のみ更新（前のデータを消さない）
    if (json.shopping_list) {
      setData(prev => ({
        ...prev,
        shopping_list: json.shopping_list
      }));
    }
  } catch (e) {
    console.error("Update failed", e);
  }
  setLoading(false);
};
