(async function startCloudInventory() {
    const api = window.StockManagerAPI;
    const table = document.getElementById("inventoryTable");

    if (!api || !table) {
        return;
    }

    async function waitForStore() {
        for (let attempt = 0; attempt < 30; attempt++) {
            const storeId =
                window.cloudSession?.store?.id ||
                window.StockManagerCloud?.currentStoreId;

            if (storeId) {
                return storeId;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.warn("No active cloud store found.");
        return null;
    }

    const storeId = await waitForStore();

    if (!storeId) {
        return;
    }

    const escapeHTML = value =>
        String(value ?? "").replace(/[&<>'"]/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[character]));

    async function loadCloudInventory() {
        const result = await api.products(storeId);
        const products = result.products || [];

        window.cloudProducts = products;

        if (!products.length) {
            table.innerHTML =
                '<tr><td colspan="8" class="table-empty">No cloud products yet</td></tr>';
            return;
        }

        table.innerHTML = products.map(product => `
            <tr>
                <td><strong>${escapeHTML(product.name)}</strong></td>
                <td>${escapeHTML(product.category)}</td>
                <td>${product.quantity}</td>
                <td>KSh ${Number(product.buying_price).toLocaleString()}</td>
                <td>KSh ${Number(product.selling_price).toLocaleString()}</td>
                <td>KSh ${(Number(product.quantity) * Number(product.buying_price)).toLocaleString()}</td>
                <td>
                    ${
                        product.quantity <= 0
                            ? "Out of Stock"
                            : product.quantity <= product.low_stock_limit
                                ? "Low Stock"
                                : "In Stock"
                    }
                </td>
                <td>
                    <button
                        type="button"
                        data-cloud-delete="${product.id}"
                    >
                        🗑️
                    </button>
                </td>
            </tr>
        `).join("");
    }

    table.addEventListener("click", async event => {
        const deleteButton =
            event.target.closest("[data-cloud-delete]");

        if (!deleteButton) {
            return;
        }

        if (confirm("Delete this product?")) {
            await api.deleteProduct(
                storeId,
                deleteButton.dataset.cloudDelete
            );

            await loadCloudInventory();
        }
    });

    await loadCloudInventory();
})();