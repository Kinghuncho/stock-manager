document.addEventListener("DOMContentLoaded", () => {
    const api = window.StockManagerAPI;
    const authGate = document.getElementById("authScreen");
    const loginForm = document.getElementById("loginForm");

    function showMessage(id, text, type = "error") {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = text;
            element.className = `auth-message ${type}`;
        }
    }

    async function openApplication(user) {
        const storesResult = await api.stores();
        const storeList = storesResult.stores || [];
        const activeStore = storeList[0] || null;

        window.cloudSession = {
            user,
            stores: storeList,
            store: activeStore
        };

        if (window.StockManagerCloud) {
            window.StockManagerCloud.currentUser = user;
            window.StockManagerCloud.stores = storeList;

            if (activeStore) {
                window.StockManagerCloud.setStore(activeStore.id);
            }
        }

        if (authGate) {
            authGate.style.setProperty("display", "none", "important");
            authGate.hidden = true;
        }

        document.body.classList.remove("auth-locked");
    }

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();
                event.stopImmediatePropagation();

                const email = document
                    .getElementById("loginEmail")
                    .value
                    .trim();

                const password =
                    document.getElementById("loginPassword").value;

                try {
                    const result = await api.login(email, password);

                    await openApplication(result.user);

                    showMessage(
                        "loginMessage",
                        "Signed in successfully.",
                        "success"
                    );
                } catch (error) {
                    showMessage("loginMessage", error.message);
                }
            },
            true
        );
    }

    api.me()
        .then(result => openApplication(result.user))
        .catch(() => {});
});