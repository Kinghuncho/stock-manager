/* Phase 5.9 cloud page data adapter. Wire page renderers to these methods. */
window.StockManagerCloudPages = {
  async loadAll(storeId) {
    const api = window.StockManagerAPI;
    const [products, purchases, sales, expenses, dashboard] = await Promise.all([
      api.products(storeId), api.purchases(storeId), api.sales(storeId), api.expenses(storeId), api.dashboard(storeId)
    ]);
    return { products: products.products || [], purchases: purchases.purchases || [], sales: sales.sales || [], expenses: expenses.expenses || [], dashboard };
  },
  async loadReport(storeId, from, to) { return window.StockManagerAPI.reports(storeId, from, to); },
  showError(error) { console.error(error); alert(error.message || 'Could not load cloud data.'); }
};
