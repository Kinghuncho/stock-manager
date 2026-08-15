(function () {
    const cloud = window.StockManagerCloud || {};

    cloud.stores = [];
    cloud.currentStore = null;
    cloud.currentStoreId = null;
    cloud.currentUser = null;
    cloud.connected = false;

    cloud.setStore = function (storeId) {
        const store = cloud.stores.find(item => item.id === storeId);

        if (!store) {
            throw new Error("Store not found.");
        }

        cloud.currentStore = store;
        cloud.currentStoreId = store.id;

        return store;
    };

    cloud.chooseStore = function (storeId) {
        return cloud.setStore(storeId);
    };

    cloud.requireStore = function () {
        if (!cloud.currentStoreId) {
            throw new Error("No active store selected.");
        }

        return cloud.currentStoreId;
    };

    window.StockManagerCloud = cloud;
})();
