// App.js の generateMenu 関数内を以下のように修正
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
        needs_lunch: [],
        rejected_menus: isRetry ? rejectedMenus : []
      })
    });
    
    const json = await res.json();

    // エラーチェックを強化
    if (!json || json.error) {
      throw new Error(json?.message || json?.error || "サーバーからの応答が不正です");
    }

    // menu が存在するか確認してから map を実行
    if (json.menu && Array.isArray(json.menu)) {
      const menuWithStatus = json.menu.map(m => ({
        ...m,
        status: "OK",
        isNextDay: false,
        isLunchTarget: false
      }));
      setData({ ...json, menu: menuWithStatus });
    } else {
      throw new Error("献立データが空です。もう一度お試しください。");
    }

  } catch (e) {
    console.error(e);
    alert("エラー: " + e.message);
  } finally {
    setLoading(false);
  }
};

// 買い物リストの表示部分も以下のように ?. を追加して保護
// {data?.shopping_list?.map((item, i) => ( ... ))}
