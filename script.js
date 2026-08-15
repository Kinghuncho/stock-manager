/* =========================================
   STOCK MANAGER
   Inventory Management System
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================
       AUTHENTICATION / SECURITY FOUNDATION
    ===================================== */

    const authScreen = document.getElementById("authScreen");
    const loginView = document.getElementById("loginView");
    const setupView = document.getElementById("setupView");
    const changePasswordView = document.getElementById("changePasswordView");
    const loginForm = document.getElementById("loginForm");
    const setupForm = document.getElementById("setupForm");
    const changePasswordForm = document.getElementById("changePasswordForm");
    const loginMessage = document.getElementById("loginMessage");
    const setupMessage = document.getElementById("setupMessage");
    const passwordMessage = document.getElementById("passwordMessage");

    const AUTH_KEY = "stockManagerAuth";
    const SESSION_KEY = "stockManagerAuthSession";
    const REMEMBERED_SESSION_KEY = "stockManagerRememberedSession";

    function getAuthAccount() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
        } catch (error) {
            return null;
        }
    }

    function setAuthMessage(element, message, type = "error") {
        if (!element) return;
        element.textContent = message;
        element.className = "auth-message " + type;
    }

    function clearAuthMessages() {
        [loginMessage, setupMessage, passwordMessage].forEach(element => {
            if (element) {
                element.textContent = "";
                element.className = "auth-message";
            }
        });
    }

    function showAuthView(view) {
        [loginView, setupView, changePasswordView].forEach(element => {
            if (element) element.hidden = element !== view;
        });
        clearAuthMessages();
    }

    function hasValidSession() {
        const remembered = localStorage.getItem(REMEMBERED_SESSION_KEY);
        const session = sessionStorage.getItem(SESSION_KEY);
        return remembered === "1" || session === "1";
    }

    function openAuthGate() {
        if (!authScreen) return;
        authScreen.style.display = "flex";
        document.body.classList.add("auth-locked");
    }

    function closeAuthGate() {
        if (!authScreen) return;
        authScreen.style.display = "none";
        document.body.classList.remove("auth-locked");
    }

    function createRandomSalt() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
    }

    async function hashPassword(password, salt) {
        const data = new TextEncoder().encode(salt + ":" + password);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(digest))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    async function saveAuthAccount(name, email, password) {
        const salt = createRandomSalt();
        const passwordHash = await hashPassword(password, salt);

        localStorage.setItem(AUTH_KEY, JSON.stringify({
            displayName: name,
            email: email.toLowerCase(),
            salt,
            passwordHash,
            createdAt: new Date().toISOString()
        }));
    }

    async function verifyCredentials(email, password) {
        const account = getAuthAccount();
        if (!account || !account.salt || !account.passwordHash) return false;
        const candidateHash = await hashPassword(password, account.salt);
        return account.email === email.toLowerCase() && candidateHash === account.passwordHash;
    }

    function startSession(remember) {
        sessionStorage.setItem(SESSION_KEY, "1");
        if (remember) {
            localStorage.setItem(REMEMBERED_SESSION_KEY, "1");
        } else {
            localStorage.removeItem(REMEMBERED_SESSION_KEY);
        }
        closeAuthGate();
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(REMEMBERED_SESSION_KEY);
        openAuthGate();
        showAuthView(loginView);
        if (loginForm) loginForm.reset();
    }

    if (authScreen) {
        const account = getAuthAccount();
        if (account && hasValidSession()) {
            closeAuthGate();
        } else if (account) {
            showAuthView(loginView);
            openAuthGate();
        } else {
            showAuthView(setupView);
            openAuthGate();
        }
    }

    document.querySelectorAll(".password-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);
            if (!input) return;
            input.type = input.type === "password" ? "text" : "password";
            button.textContent = input.type === "password" ? "Show" : "Hide";
        });
    });

    if (setupForm) {
        setupForm.addEventListener("submit", async event => {
            event.preventDefault();

            const name = document.getElementById("setupName").value.trim();
            const email = document.getElementById("setupEmail").value.trim().toLowerCase();
            const password = document.getElementById("setupPassword").value;
            const confirmation = document.getElementById("setupConfirmPassword").value;

            if (password.length < 8) {
                setAuthMessage(setupMessage, "Password must be at least 8 characters.");
                return;
            }

            if (password !== confirmation) {
                setAuthMessage(setupMessage, "Passwords do not match.");
                return;
            }

            try {
                await saveAuthAccount(name, email, password);

                localStorage.setItem("stockManagerAccountSettings", JSON.stringify({
                    displayName: name,
                    email
                }));

                startSession(true);
                alert("Administrator account created successfully.");
            } catch (error) {
                console.error(error);
                setAuthMessage(setupMessage, "Could not create the account on this browser.");
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async event => {
            event.preventDefault();

            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;
            const remember = document.getElementById("rememberSession").checked;

            try {
                const valid = await verifyCredentials(email, password);
                if (!valid) {
                    setAuthMessage(loginMessage, "Incorrect email or password.");
                    return;
                }

                startSession(remember);
            } catch (error) {
                console.error(error);
                setAuthMessage(loginMessage, "Unable to verify your login.");
            }
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async event => {
            event.preventDefault();

            const current = document.getElementById("currentPassword").value;
            const next = document.getElementById("newPassword").value;
            const confirmation = document.getElementById("confirmNewPassword").value;
            const account = getAuthAccount();

            if (!account) {
                setAuthMessage(passwordMessage, "No administrator account exists.");
                return;
            }

            if (next.length < 8) {
                setAuthMessage(passwordMessage, "New password must be at least 8 characters.");
                return;
            }

            if (next !== confirmation) {
                setAuthMessage(passwordMessage, "New passwords do not match.");
                return;
            }

            const validCurrent = await verifyCredentials(account.email, current);
            if (!validCurrent) {
                setAuthMessage(passwordMessage, "Current password is incorrect.");
                return;
            }

            const salt = createRandomSalt();
            const passwordHash = await hashPassword(next, salt);
            account.salt = salt;
            account.passwordHash = passwordHash;
            account.updatedAt = new Date().toISOString();
            localStorage.setItem(AUTH_KEY, JSON.stringify(account));

            changePasswordForm.reset();
            setAuthMessage(passwordMessage, "Password updated successfully.", "success");
            setTimeout(() => showAuthView(loginView), 900);
        });
    }

    const cancelPasswordChange = document.getElementById("cancelPasswordChange");
    if (cancelPasswordChange) {
        cancelPasswordChange.addEventListener("click", () => {
            showAuthView(loginView);
        });
    }


    /* =====================================
       APPLICATION STATE
    ===================================== */

    let products = JSON.parse(
        localStorage.getItem("stockManagerProducts")
    ) || [];

    window.products = products;

let purchases = JSON.parse(
    localStorage.getItem(
        "stockManagerPurchases"
    )
) || [];

window.purchases = purchases;

    let editingProductId = null;


    /* =====================================
       ELEMENTS
    ===================================== */

    const navLinks =
        document.querySelectorAll(".nav-link");

    const pages =
        document.querySelectorAll(".page");

    const sidebar =
        document.getElementById("sidebar");

    const menuButton =
        document.getElementById("menuButton");

    const productModal =
        document.getElementById("productModal");

    const productForm =
        document.getElementById("productForm");

    const addProductButton =
        document.getElementById("addProductButton");

    const inventoryAddButton =
        document.getElementById("inventoryAddButton");

    const closeModal =
        document.getElementById("closeModal");

    const cancelProduct =
        document.getElementById("cancelProduct");

    const inventoryTable =
        document.getElementById("inventoryTable");

    const dashboardInventoryTable =
        document.getElementById(
            "dashboardInventoryTable"
        );

    const inventorySearch =
        document.getElementById("inventorySearch");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const stockFilter =
        document.getElementById("stockFilter");

    const globalSearch =
        document.getElementById("globalSearch");

    const modalTitle =
        document.getElementById("modalTitle");

    const saveProductButton =
        document.getElementById("saveProductButton");
        function closeAllModals() {

    const modals = document.querySelectorAll(".modal-overlay");

    modals.forEach(modal => {
        modal.classList.remove("show");
    });

}

/* =====================================
   PURCHASE ELEMENTS
===================================== */

const purchaseModal =
    document.getElementById("purchaseModal");

const purchaseForm =
    document.getElementById("purchaseForm");

const addPurchaseButton =
    document.getElementById("addPurchaseButton");
    if (addPurchaseButton) {
        addPurchaseButton.addEventListener("click", function(event) {
            event.preventDefault();

            if (purchaseModal) {

    closeAllModals();

    populatePurchaseProducts();

    purchaseModal.classList.add("show");
}
        });
    }
const closePurchaseModal =
    document.getElementById(
        "closePurchaseModal"
    );

const cancelPurchase =
    document.getElementById(
        "cancelPurchase"
    );


    function closePurchaseWindow() {
        if (purchaseModal) {
            purchaseModal.classList.remove("show");
        }
    }

    if (closePurchaseModal) {
        closePurchaseModal.addEventListener("click", closePurchaseWindow);
    }

    if (cancelPurchase) {
        cancelPurchase.addEventListener("click", closePurchaseWindow);
    }

    if (purchaseModal) {
        purchaseModal.addEventListener("click", function(event) {
            if (event.target === purchaseModal) {
                closePurchaseWindow();
            }
        });
    }
const purchaseProduct =
    document.getElementById(
        "purchaseProduct"
    );

const purchaseQuantity =
    document.getElementById(
        "purchaseQuantity"
    );

const purchaseUnitCost =
    document.getElementById(
        "purchaseUnitCost"
    );

const purchaseSupplier =
    document.getElementById(
        "purchaseSupplier"
    );

const purchaseDate =
    document.getElementById(
        "purchaseDate"
    );

const purchaseReference =
    document.getElementById(
        "purchaseReference"
    );

const purchaseTotal =
    document.getElementById(
        "purchaseTotal"
    );

const purchaseTable =
    document.getElementById(
        "purchaseTable"
    );

    function populatePurchaseProducts() {

    const select =
        document.getElementById("purchaseProduct");

    if (!select) {
        console.warn(
            "Purchase product dropdown not found."
        );
        return;
    }

    const products =
        JSON.parse(
            localStorage.getItem("stockManagerProducts")
        ) || [];

    select.innerHTML =
        '<option value="">Select a product</option>';

    products.forEach(function(product) {

        const option =
            document.createElement("option");

        option.value =
            product.id || product.name;

        option.textContent =
            product.name || "Unnamed Product";

        select.appendChild(option);
    });
}
/* =====================================
   SALES ELEMENTS
===================================== */

const saleModal =
    document.getElementById("saleModal");

const saleForm =
    document.getElementById("saleForm");

const addSaleButton =
    document.getElementById("addSaleButton");

const closeSaleModal =
    document.getElementById("closeSaleModal");

const cancelSale =
    document.getElementById("cancelSale");

const saleProduct =
    document.getElementById("saleProduct");

const saleQuantity =
    document.getElementById("saleQuantity");

const saleUnitPrice =
    document.getElementById("saleUnitPrice");

const saleCustomer =
    document.getElementById("saleCustomer");

const saleDate =
    document.getElementById("saleDate");

const saleTotal =
    document.getElementById("saleTotal");


/* =====================================
   SALES STORAGE
===================================== */

let sales =
    JSON.parse(
        localStorage.getItem(
            "stockManagerSales"
        )
    ) || [];

window.sales = sales;


/* =====================================
   OPEN SALES MODAL
===================================== */

if (addSaleButton) {

    addSaleButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            populateSaleProducts();

            if (saleDate) {

                saleDate.value =
                    new Date()
                        .toISOString()
                        .split("T")[0];

            }

            closeAllModals();

            if (saleModal) {

                saleModal.classList.add("show");

            }

        }
    );

}

/* =====================================
   CLOSE SALES MODAL
===================================== */

function closeSaleWindow() {

    if (saleModal) {

        saleModal.classList.remove("show");

    }

}


if (closeSaleModal) {

    closeSaleModal.addEventListener(
        "click",
        closeSaleWindow
    );

}


if (cancelSale) {

    cancelSale.addEventListener(
        "click",
        closeSaleWindow
    );

}


if (saleModal) {

    saleModal.addEventListener(
        "click",
        function(event) {

            if (
                event.target === saleModal
            ) {

                closeSaleWindow();

            }

        }
    );

}


/* =====================================
   POPULATE SALE PRODUCTS
===================================== */

function populateSaleProducts() {

    if (!saleProduct) {

        console.warn(
            "Sale product dropdown not found."
        );

        return;

    }


    saleProduct.innerHTML =
        '<option value="">Select product</option>';


    products.forEach(
        function(product) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                product.id;

            option.textContent =
                `${product.name} — Stock: ${product.quantity}`;

            saleProduct.appendChild(
                option
            );

        }
    );

}


/* =====================================
   AUTO-FILL SELLING PRICE
===================================== */

if (saleProduct) {

    saleProduct.addEventListener(
        "change",
        function() {

            const productId =
                Number(
                    saleProduct.value
                );

            const product =
                products.find(
                    item =>
                        item.id ===
                        productId
                );


            if (product) {

                saleUnitPrice.value =
                    product.sellingPrice;

            } else {

                saleUnitPrice.value =
                    "";

            }


            updateSaleTotal();

        }
    );

}


/* =====================================
   SALE TOTAL
===================================== */

function updateSaleTotal() {

    const quantity =
        Number(
            saleQuantity?.value
        ) || 0;


    const unitPrice =
        Number(
            saleUnitPrice?.value
        ) || 0;


    const total =
        quantity * unitPrice;


    if (saleTotal) {

        saleTotal.textContent =
            formatCurrency(total);

    }

}


if (saleQuantity) {

    saleQuantity.addEventListener(
        "input",
        updateSaleTotal
    );

}


if (saleUnitPrice) {

    saleUnitPrice.addEventListener(
        "input",
        updateSaleTotal
    );

}



/* =====================================
   RECORD SALE
===================================== */

if (saleForm) {
    saleForm.addEventListener("submit", event => {
        event.preventDefault();

        const productId = Number(saleProduct.value);
        const quantity = Number(saleQuantity.value);
        const unitPrice = Number(saleUnitPrice.value);
        const customer = saleCustomer.value.trim();
        const date = saleDate.value;

        if (!productId || quantity <= 0 || unitPrice < 0 || !date) {
            alert("Please enter valid sale details.");
            return;
        }

        const product = products.find(item => item.id === productId);

        if (!product) {
            alert("Product could not be found.");
            return;
        }

        if (quantity > product.quantity) {
            alert(`Only ${product.quantity} units of ${product.name} are available.`);
            return;
        }

        product.quantity -= quantity;

        const unitCost = Number(product.buyingPrice || 0);

        const sale = {
            id: Date.now(),
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            unitCost,
            total: quantity * unitPrice,
            costTotal: quantity * unitCost,
            customer,
            date,
            createdAt: new Date().toISOString()
        };

        sales.push(sale);
        window.sales = sales;

        saveProducts();
        localStorage.setItem("stockManagerSales", JSON.stringify(sales));

        saleForm.reset();
        closeSaleWindow();
        refreshApplication();
        renderSales();
        updateSalesStats();

        alert(`${quantity} units of ${product.name} sold successfully.`);
    });
}

function renderSales() {
    const table = document.getElementById("salesTable");
    if (!table) return;

    if (sales.length === 0) {
        table.innerHTML = `<tr><td colspan="6" class="table-empty">No sales recorded yet</td></tr>`;
        return;
    }

    table.innerHTML = [...sales]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(sale => `
            <tr>
                <td><strong>${escapeHTML(sale.productName)}</strong></td>
                <td>${sale.quantity}</td>
                <td>${formatCurrency(sale.unitPrice)}</td>
                <td><strong>${formatCurrency(sale.total)}</strong></td>
                <td>${sale.customer ? escapeHTML(sale.customer) : "—"}</td>
                <td>${formatDate(sale.date)}</td>
                <td>
                    <button class="table-action-button" type="button" onclick="printSaleReceipt(${sale.id})" title="Print receipt">🧾</button>
                </td>
            </tr>
        `).join("");
}

function updateSalesStats() {
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const soldUnits = sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayRevenue = sales
        .filter(sale => sale.date === today)
        .reduce((sum, sale) => sum + Number(sale.total || 0), 0);

    const totalSalesEl = document.getElementById("totalSales");
    const revenueEl = document.getElementById("salesRevenue");
    const unitsEl = document.getElementById("soldUnits");
    const todayEl = document.getElementById("todaySales");

    if (totalSalesEl) totalSalesEl.textContent = sales.length;
    if (revenueEl) revenueEl.textContent = formatCurrency(totalRevenue);
    if (unitsEl) unitsEl.textContent = soldUnits;
    if (todayEl) todayEl.textContent = formatCurrency(todayRevenue);
}

/* =====================================
   EXPENSE ELEMENTS
===================================== */

const expenseModal =
    document.getElementById(
        "expenseModal"
    );

const expenseForm =
    document.getElementById(
        "expenseForm"
    );

const addExpenseButton =
    document.getElementById(
        "addExpenseButton"
    );

const closeExpenseModal =
    document.getElementById(
        "closeExpenseModal"
    );

const cancelExpense =
    document.getElementById(
        "cancelExpense"
    );

const expenseDate =
    document.getElementById(
        "expenseDate"
    );


/* =====================================
   EXPENSE STORAGE
===================================== */

let expenses =
    JSON.parse(
        localStorage.getItem(
            "stockManagerExpenses"
        )
    ) || [];

window.expenses = expenses;


/* =====================================
   OPEN EXPENSE MODAL
===================================== */

if (addExpenseButton) {

    addExpenseButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();


            if (expenseDate) {

                expenseDate.value =
                    new Date()
                        .toISOString()
                        .split("T")[0];

            }


            if (expenseModal) {
                closeAllModals();
                expenseModal.classList.add("show");
            }

        }
    );

}


/* =====================================
   CLOSE EXPENSE MODAL
===================================== */

function closeExpenseWindow() {

    if (expenseModal) {

        expenseModal.classList.remove(
            "show"
        );

    }

}


if (closeExpenseModal) {

    closeExpenseModal.addEventListener(
        "click",
        closeExpenseWindow
    );

}


if (cancelExpense) {

    cancelExpense.addEventListener(
        "click",
        closeExpenseWindow
    );

}


if (expenseModal) {

    expenseModal.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                expenseModal
            ) {

                closeExpenseWindow();

            }

        }
    );

}


/* =====================================
   RECORD EXPENSE
===================================== */

if (expenseForm) {
    expenseForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("expenseName").value.trim();
        const category = document.getElementById("expenseCategory").value;
        const amount = Number(document.getElementById("expenseAmount").value);
        const date = expenseDate.value;
        const description = document.getElementById("expenseDescription").value.trim();

        if (!name || !category || amount < 0 || !date) {
            alert("Please enter valid expense details.");
            return;
        }

        const expense = {
            id: Date.now(),
            name,
            category,
            amount,
            date,
            description,
            createdAt: new Date().toISOString()
        };

        expenses.push(expense);
        window.expenses = expenses;
        localStorage.setItem("stockManagerExpenses", JSON.stringify(expenses));

        expenseForm.reset();
        closeExpenseWindow();
        renderExpenses();
        updateExpenseStats();

        alert(`${formatCurrency(amount)} expense recorded successfully.`);
    });
}

function renderExpenses() {
    const table = document.getElementById("expenseTable");
    if (!table) return;

    if (expenses.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="table-empty">No expenses recorded yet</td></tr>`;
        return;
    }

    table.innerHTML = [...expenses]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(expense => `
            <tr>
                <td><strong>${escapeHTML(expense.name)}</strong></td>
                <td>${escapeHTML(expense.category)}</td>
                <td><strong>${formatCurrency(expense.amount)}</strong></td>
                <td>${expense.description ? escapeHTML(expense.description) : "—"}</td>
                <td>${formatDate(expense.date)}</td>
                <td>
                    <button class="table-action-button" type="button" onclick="printExpenseRecord(${expense.id})" title="Print expense record">🧾</button>
                </td>
            </tr>
        `).join("");
}

function updateExpenseStats() {
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthly = expenses
        .filter(expense => {
            const d = new Date(expense.date);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const latest = [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const totalEl = document.getElementById("totalExpenses");
    const spendingEl = document.getElementById("expenseSpending");
    const monthlyEl = document.getElementById("monthlyExpenses");
    const latestEl = document.getElementById("latestExpense");

    if (totalEl) totalEl.textContent = expenses.length;
    if (spendingEl) spendingEl.textContent = formatCurrency(total);
    if (monthlyEl) monthlyEl.textContent = formatCurrency(monthly);
    if (latestEl) latestEl.textContent = latest ? formatDate(latest.date) : "—";
}

/* =====================================
   PURCHASE TOTAL
===================================== */

function updatePurchaseTotal() {

    const quantity =
        Number(
            purchaseQuantity.value
        ) || 0;

    const unitCost =
        Number(
            purchaseUnitCost.value
        ) || 0;


    const total =
        quantity * unitCost;


    purchaseTotal.textContent =
        formatCurrency(total);

}


purchaseQuantity.addEventListener(
    "input",
    updatePurchaseTotal
);


purchaseUnitCost.addEventListener(
    "input",
    updatePurchaseTotal
);
/* =====================================
   RECORD PURCHASE
===================================== */

purchaseForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const productId =
            Number(
                purchaseProduct.value
            );


        const quantity =
            Number(
                purchaseQuantity.value
            );


        const unitCost =
            Number(
                purchaseUnitCost.value
            );


        const supplier =
            purchaseSupplier.value.trim();


        const date =
            purchaseDate.value;


        const reference =
            purchaseReference.value.trim();


        if (!productId) {

            alert(
                "Please select a product."
            );

            return;

        }


        if (
            quantity <= 0 ||
            unitCost < 0
        ) {

            alert(
                "Please enter valid purchase values."
            );

            return;

        }


        const product =
            products.find(
                item =>
                    item.id ===
                    productId
            );


        if (!product) {

            alert(
                "Product could not be found."
            );

            return;

        }


        /* ================================
           UPDATE INVENTORY
        ================================= */

        product.quantity += quantity;


        /*
         * Update the buying price to the
         * latest purchase price.
         */

        product.buyingPrice =
            unitCost;


        /* ================================
           CREATE PURCHASE RECORD
        ================================= */

        const purchase = {

            id: Date.now(),

            productId:
                product.id,

            productName:
                product.name,

            quantity,

            unitCost,

            total:
                quantity * unitCost,

            supplier,

            date,

            reference,

            createdAt:
                new Date().toISOString()

        };


        purchases.push(
            purchase
        );


        saveProducts();

        savePurchases();


        closePurchaseWindow();


        refreshApplication();

        renderPurchases();


        alert(
            `${quantity} units of ${product.name} added to inventory.`
        );

    }
);
/* =====================================
   PURCHASE HISTORY
===================================== */

function renderPurchases() {

    if (
        purchases.length === 0
    ) {

        purchaseTable.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-empty"
                >
                    No purchases recorded yet
                </td>

            </tr>

        `;

        return;

    }


    const sortedPurchases =
        [...purchases]
            .sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );


    purchaseTable.innerHTML =
        sortedPurchases
            .map(purchase => `

                <tr>

                    <td>

                        <div
                            class="purchase-product"
                        >

                            <strong>
                                ${escapeHTML(
                                    purchase.productName
                                )}
                            </strong>

                            <small>
                                Purchase #${purchase.id}
                            </small>

                        </div>

                    </td>


                    <td>
                        ${purchase.quantity}
                    </td>


                    <td>
                        ${formatCurrency(
                            purchase.unitCost
                        )}
                    </td>


                    <td>
                        <strong>
                            ${formatCurrency(
                                purchase.total
                            )}
                        </strong>
                    </td>


                    <td>
                        ${
                            purchase.supplier
                                ? escapeHTML(
                                    purchase.supplier
                                )
                                : "—"
                        }
                    </td>


                    <td>
                        ${formatDate(
                            purchase.date
                        )}
                    </td>


                    <td>
                        ${
                            purchase.reference
                                ? escapeHTML(
                                    purchase.reference
                                )
                                : "—"
                        }
                    </td>

                    <td>
                        <button class="table-action-button" type="button" onclick="printPurchaseRecord(${purchase.id})" title="Print purchase record">🧾</button>
                    </td>

                </tr>

            `)
            .join("");

}
/* =====================================
   PURCHASE STATISTICS
===================================== */

function updatePurchaseStats() {

    const totalPurchases =
        purchases.length;


    const totalSpent =
        purchases.reduce(
            (total, purchase) =>
                total +
                purchase.total,
            0
        );


    const totalUnits =
        purchases.reduce(
            (total, purchase) =>
                total +
                purchase.quantity,
            0
        );


    let latestDate = null;


    if (purchases.length > 0) {

        latestDate =
            [...purchases]
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                )[0]
                .date;

    }


    document.getElementById(
        "totalPurchases"
    ).textContent =
        totalPurchases;


    document.getElementById(
        "purchaseSpending"
    ).textContent =
        formatCurrency(
            totalSpent
        );


    document.getElementById(
        "purchasedUnits"
    ).textContent =
        totalUnits;


    document.getElementById(
        "latestPurchase"
    ).textContent =
        latestDate
            ? formatDate(latestDate)
            : "—";

}


    /* =====================================
       NAVIGATION
    ===================================== */

    navLinks.forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

            const pageId =
                link.dataset.page;

            navLinks.forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");

            pages.forEach(page => {
                page.classList.remove("active-page");
            });

            const selectedPage =
                document.getElementById(pageId);

            if (selectedPage) {

                selectedPage.classList.add(
                    "active-page"
                );

            }

            sidebar.classList.remove("open");

            if (pageId === "inventory") {

    renderInventory();

}

if (pageId === "purchases") {

    populatePurchaseProducts();

    renderPurchases();

    updatePurchaseStats();

        renderSales();

        updateSalesStats();

        renderExpenses();

        updateExpenseStats();

}

if (pageId === "sales") {

    populateSaleProducts();
    renderSales();
    updateSalesStats();

}

if (pageId === "expenses") {

    renderExpenses();
    updateExpenseStats();

}

        });

    });


    /* =====================================
       MOBILE MENU
    ===================================== */

    if (menuButton) {

        menuButton.addEventListener("click", () => {

            sidebar.classList.toggle("open");

        });

    }


    /* =====================================
       LOCAL STORAGE
    ===================================== */

    function saveProducts() {

        localStorage.setItem(
            "stockManagerProducts",
            JSON.stringify(products)
        );

    }
function savePurchases() {

    localStorage.setItem(
        "stockManagerPurchases",
        JSON.stringify(purchases)
    );

}

    /* =====================================
       CURRENCY
    ===================================== */

    function formatCurrency(value) {

        return `KSh ${Number(value).toLocaleString(
            "en-KE",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )}`;

    }


    /* =====================================
       PRODUCT STATUS
    ===================================== */

    function getProductStatus(product) {

        if (product.quantity <= 0) {

            return {
                text: "Out of Stock",
                className: "stock-out"
            };

        }

        if (
            product.quantity <=
            product.lowStockLimit
        ) {

            return {
                text: "Low Stock",
                className: "stock-low"
            };

        }

        return {
            text: "In Stock",
            className: "stock-normal"
        };

    }


    /* =====================================
       MODAL
    ===================================== */

    function openProductModal(product = null) {

        productModal.classList.add("show");

        if (product) {

            editingProductId = product.id;

            modalTitle.textContent =
                "Edit Product";

            saveProductButton.textContent =
                "Update Product";

            document.getElementById(
                "productName"
            ).value = product.name;

            document.getElementById(
                "productCategory"
            ).value = product.category;

            document.getElementById(
                "productQuantity"
            ).value = product.quantity;

            document.getElementById(
                "lowStockLimit"
            ).value = product.lowStockLimit;

            document.getElementById(
                "buyingPrice"
            ).value = product.buyingPrice;

            document.getElementById(
                "sellingPrice"
            ).value = product.sellingPrice;

        } else {

            editingProductId = null;

            modalTitle.textContent =
                "Add Product";

            saveProductButton.textContent =
                "Add Product";

            productForm.reset();

        }

    }


    function closeProductModal() {

        productModal.classList.remove("show");

        productForm.reset();

        editingProductId = null;

        modalTitle.textContent =
            "Add Product";

        saveProductButton.textContent =
            "Add Product";

    }


    addProductButton.addEventListener(
        "click",
        () => openProductModal()
    );


    inventoryAddButton.addEventListener(
        "click",
        () => openProductModal()
    );


    closeModal.addEventListener(
        "click",
        closeProductModal
    );


    cancelProduct.addEventListener(
        "click",
        closeProductModal
    );


    productModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                productModal
            ) {

                closeProductModal();

            }

        }
    );


    /* =====================================
       ADD / EDIT PRODUCT
    ===================================== */

    productForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const name =
                document.getElementById(
                    "productName"
                ).value.trim();

            const category =
                document.getElementById(
                    "productCategory"
                ).value;

            const quantity =
                Number(
                    document.getElementById(
                        "productQuantity"
                    ).value
                );

            const lowStockLimit =
                Number(
                    document.getElementById(
                        "lowStockLimit"
                    ).value
                );

            const buyingPrice =
                Number(
                    document.getElementById(
                        "buyingPrice"
                    ).value
                );

            const sellingPrice =
                Number(
                    document.getElementById(
                        "sellingPrice"
                    ).value
                );


            if (!name || !category) {

                alert(
                    "Please complete all required fields."
                );

                return;

            }


            if (
                quantity < 0 ||
                lowStockLimit < 0 ||
                buyingPrice < 0 ||
                sellingPrice < 0
            ) {

                alert(
                    "Values cannot be negative."
                );

                return;

            }


            /* =================================
               EDIT EXISTING PRODUCT
            ================================= */

            if (editingProductId !== null) {

                const productIndex =
                    products.findIndex(
                        product =>
                            product.id ===
                            editingProductId
                    );

                if (productIndex !== -1) {

                    products[productIndex] = {

                        ...products[productIndex],

                        name,
                        category,
                        quantity,
                        lowStockLimit,
                        buyingPrice,
                        sellingPrice

                    };

                }

            }


            /* =================================
               ADD NEW PRODUCT
            ================================= */

            else {

                const newProduct = {

                    id: Date.now(),

                    name,

                    category,

                    quantity,

                    lowStockLimit,

                    buyingPrice,

                    sellingPrice,

                    createdAt:
                        new Date().toISOString()

                };

                products.push(newProduct);

            }


            saveProducts();

            closeProductModal();

            refreshApplication();

        }
    );


    /* =====================================
       DELETE PRODUCT
    ===================================== */

    function deleteProduct(id) {

        const product =
            products.find(
                item => item.id === id
            );

        if (!product) {
            return;
        }


        const confirmed =
            confirm(
                `Delete "${product.name}" from inventory?`
            );


        if (!confirmed) {
            return;
        }


        products =
            products.filter(
                item => item.id !== id
            );


        saveProducts();

        refreshApplication();

    }


    /* =====================================
       EDIT PRODUCT
    ===================================== */

    function editProduct(id) {

        const product =
            products.find(
                item => item.id === id
            );

        if (!product) {
            return;
        }

        openProductModal(product);

    }


    /* =====================================
       INVENTORY FILTERING
    ===================================== */

    function getFilteredProducts() {

        const searchTerm =
            inventorySearch.value
                .toLowerCase()
                .trim();

        const category =
            categoryFilter.value;

        const stockStatus =
            stockFilter.value;


        return products.filter(product => {

            const matchesSearch =
                product.name
                    .toLowerCase()
                    .includes(searchTerm) ||

                product.category
                    .toLowerCase()
                    .includes(searchTerm);


            const matchesCategory =
                category === "all" ||
                product.category === category;


            let matchesStock = true;


            if (stockStatus === "normal") {

                matchesStock =
                    product.quantity >
                    product.lowStockLimit;

            }


            if (stockStatus === "low") {

                matchesStock =
                    product.quantity > 0 &&
                    product.quantity <=
                    product.lowStockLimit;

            }


            if (stockStatus === "out") {

                matchesStock =
                    product.quantity <= 0;

            }


            return (
                matchesSearch &&
                matchesCategory &&
                matchesStock
            );

        });

    }


    /* =====================================
       INVENTORY TABLE
    ===================================== */

    function renderInventory() {

        const filteredProducts =
            getFilteredProducts();


        if (filteredProducts.length === 0) {

            inventoryTable.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="table-empty"
                    >
                        ${
                            products.length === 0
                                ? "No products yet"
                                : "No products match your filters"
                        }
                    </td>

                </tr>

            `;

            return;

        }


        inventoryTable.innerHTML =
            filteredProducts
                .map(product => {

                    const status =
                        getProductStatus(product);

                    const stockValue =
                        product.quantity *
                        product.buyingPrice;


                    return `

                        <tr>

                            <td>

                                <div class="product-name-cell">

                                    <strong>
                                        ${escapeHTML(
                                            product.name
                                        )}
                                    </strong>

                                    <small>
                                        Added ${formatDate(
                                            product.createdAt
                                        )}
                                    </small>

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(
                                    product.category
                                )}
                            </td>


                            <td>
                                ${product.quantity}
                            </td>


                            <td>
                                ${formatCurrency(
                                    product.buyingPrice
                                )}
                            </td>


                            <td>
                                ${formatCurrency(
                                    product.sellingPrice
                                )}
                            </td>


                            <td>
                                ${formatCurrency(
                                    stockValue
                                )}
                            </td>


                            <td>

                                <span
                                    class="stock-status
                                    ${status.className}"
                                >
                                    ${status.text}
                                </span>

                            </td>


                            <td>

                                <div class="action-buttons">

                                    <button
                                        class="action-button"
                                        onclick="editProduct(${product.id})"
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>


                                    <button
                                        class="action-button delete"
                                        onclick="deleteProduct(${product.id})"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                })
                .join("");

    }


    /* =====================================
       DASHBOARD INVENTORY
    ===================================== */

    function renderDashboardInventory() {

        const recentProducts =
            [...products]
                .sort(
                    (a, b) =>
                        new Date(b.createdAt) -
                        new Date(a.createdAt)
                )
                .slice(0, 5);


        if (recentProducts.length === 0) {

            dashboardInventoryTable.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="table-empty"
                    >
                        No products yet
                    </td>

                </tr>

            `;

            return;

        }


        dashboardInventoryTable.innerHTML =
            recentProducts
                .map(product => {

                    const status =
                        getProductStatus(product);


                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </strong>
                            </td>


                            <td>
                                ${escapeHTML(
                                    product.category
                                )}
                            </td>


                            <td>
                                ${product.quantity}
                            </td>


                            <td>
                                ${formatCurrency(
                                    product.buyingPrice
                                )}
                            </td>


                            <td>
                                ${formatCurrency(
                                    product.sellingPrice
                                )}
                            </td>


                            <td>

                                <span
                                    class="stock-status
                                    ${status.className}"
                                >
                                    ${status.text}
                                </span>

                            </td>

                        </tr>

                    `;

                })
                .join("");

    }


    /* =====================================
       LOW STOCK
    ===================================== */

    function renderLowStock() {

        const lowStockProducts =
            products.filter(
                product =>
                    product.quantity <=
                    product.lowStockLimit
            );


        const lowStockList =
            document.getElementById(
                "lowStockList"
            );


        if (lowStockProducts.length === 0) {

            lowStockList.innerHTML = `

                <div class="empty-state">

                    <span>
                        📦
                    </span>

                    <p>
                        No low-stock products
                    </p>

                </div>

            `;

            return;

        }


        lowStockList.innerHTML =
            lowStockProducts
                .slice(0, 6)
                .map(product => `

                    <div
                        class="low-stock-item"
                    >

                        <div
                            class="low-stock-product"
                        >

                            <strong>
                                ${escapeHTML(
                                    product.name
                                )}
                            </strong>

                            <span>
                                Limit:
                                ${product.lowStockLimit}
                            </span>

                        </div>


                        <div
                            class="low-stock-quantity"
                        >
                            ${product.quantity}
                            left
                        </div>

                    </div>

                `)
                .join("");

    }


    /* =====================================
       DASHBOARD STATISTICS
    ===================================== */

    function updateDashboardStats() {

        const totalProducts =
            products.length;


        const totalUnits =
            products.reduce(
                (total, product) =>
                    total +
                    product.quantity,
                0
            );


        const inventoryValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        product.quantity *
                        product.buyingPrice
                    ),
                0
            );


        const potentialRevenue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        product.quantity *
                        product.sellingPrice
                    ),
                0
            );


        const potentialProfit =
            potentialRevenue -
            inventoryValue;


        const lowStockCount =
            products.filter(
                product =>
                    product.quantity <=
                    product.lowStockLimit
            ).length;


        document.getElementById(
            "totalProducts"
        ).textContent =
            totalProducts;


        document.getElementById(
            "inventoryValue"
        ).textContent =
            formatCurrency(
                inventoryValue
            );


        document.getElementById(
            "lowStockCount"
        ).textContent =
            lowStockCount;


        document.getElementById(
            "potentialProfit"
        ).textContent =
            formatCurrency(
                potentialProfit
            );


        document.getElementById(
            "summaryProducts"
        ).textContent =
            totalProducts;


        document.getElementById(
            "summaryUnits"
        ).textContent =
            totalUnits;


        document.getElementById(
            "summaryValue"
        ).textContent =
            formatCurrency(
                inventoryValue
            );


        document.getElementById(
            "summaryRevenue"
        ).textContent =
            formatCurrency(
                potentialRevenue
            );

    }


    /* =====================================
       DATE
    ===================================== */

    function formatDate(date) {

        if (!date) {
            return "Unknown";
        }

        return new Date(date)
            .toLocaleDateString(
                "en-KE",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    /* =====================================
       SECURITY
    ===================================== */

    function escapeHTML(value) {

        const div =
            document.createElement("div");

        div.textContent = value;

        return div.innerHTML;

    }


    /* =====================================
       REFRESH EVERYTHING
    ===================================== */

    
/* =====================================
   REPORTS
===================================== */

let reportPeriod = "all";
let reportStartDate = "";
let reportEndDate = "";

function getReportDateRange() {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    if (reportStartDate || reportEndDate) {
        return {
            start: reportStartDate || "0000-01-01",
            end: reportEndDate || todayString
        };
    }

    if (reportPeriod === "today") {
        return { start: todayString, end: todayString };
    }

    if (reportPeriod === "week") {
        const d = new Date(today);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return {
            start: d.toISOString().split("T")[0],
            end: todayString
        };
    }

    if (reportPeriod === "month") {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            start: start.toISOString().split("T")[0],
            end: todayString
        };
    }

    if (reportPeriod === "year") {
        return {
            start: `${today.getFullYear()}-01-01`,
            end: todayString
        };
    }

    return { start: "0000-01-01", end: "9999-12-31" };
}

function dateInReportRange(dateValue, range) {
    if (!dateValue) return false;
    const value = String(dateValue).slice(0, 10);
    return value >= range.start && value <= range.end;
}

function getProductCostForSale(sale) {
    if (sale.costTotal !== undefined) {
        return Number(sale.costTotal || 0);
    }

    if (sale.unitCost !== undefined) {
        return Number(sale.unitCost || 0) * Number(sale.quantity || 0);
    }

    const product = products.find(item => item.id === Number(sale.productId));
    return Number(product?.buyingPrice || 0) * Number(sale.quantity || 0);
}

function renderReports() {
    const range = getReportDateRange();

    const periodSales = sales.filter(item => dateInReportRange(item.date, range));
    const periodPurchases = purchases.filter(item => dateInReportRange(item.date, range));
    const periodExpenses = expenses.filter(item => dateInReportRange(item.date, range));

    const revenue = periodSales.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const cogs = periodSales.reduce((sum, item) => sum + getProductCostForSale(item), 0);
    const grossProfit = revenue - cogs;
    const purchaseSpend = periodPurchases.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const expenseSpend = periodExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const netProfit = grossProfit - expenseSpend;
    const unitsSold = periodSales.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText("reportRevenue", formatCurrency(revenue));
    setText("reportPurchases", formatCurrency(purchaseSpend));
    setText("reportExpenses", formatCurrency(expenseSpend));
    setText("reportNetProfit", formatCurrency(netProfit));
    setText("reportSalesCount", periodSales.length);
    setText("reportUnitsSold", unitsSold);
    setText("reportCogs", formatCurrency(cogs));
    setText("reportGrossProfit", formatCurrency(grossProfit));

    const inventoryUnits = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
    const inventoryValue = products.reduce((sum, product) => sum + Number(product.quantity || 0) * Number(product.buyingPrice || 0), 0);
    const potentialRevenue = products.reduce((sum, product) => sum + Number(product.quantity || 0) * Number(product.sellingPrice || 0), 0);
    const potentialProfit = potentialRevenue - inventoryValue;

    setText("reportProductCount", products.length);
    setText("reportStockUnits", inventoryUnits);
    setText("reportInventoryValue", formatCurrency(inventoryValue));
    setText("reportPotentialRevenue", formatCurrency(potentialRevenue));
    setText("reportPotentialProfit", formatCurrency(potentialProfit));

    const topProducts = {};
    periodSales.forEach(sale => {
        const key = sale.productId || sale.productName;
        if (!topProducts[key]) {
            topProducts[key] = {
                name: sale.productName,
                units: 0,
                revenue: 0,
                cost: 0
            };
        }
        topProducts[key].units += Number(sale.quantity || 0);
        topProducts[key].revenue += Number(sale.total || 0);
        topProducts[key].cost += getProductCostForSale(sale);
    });

    const topProductsTable = document.getElementById("reportTopProducts");
    const topRows = Object.values(topProducts)
        .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
        .slice(0, 8);

    if (topProductsTable) {
        topProductsTable.innerHTML = topRows.length
            ? topRows.map(item => `
                <tr>
                    <td><strong>${escapeHTML(item.name)}</strong></td>
                    <td>${item.units}</td>
                    <td>${formatCurrency(item.revenue)}</td>
                    <td>${formatCurrency(item.revenue - item.cost)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" class="table-empty">No sales in this period</td></tr>`;
    }

    const categories = {};
    periodExpenses.forEach(expense => {
        const category = expense.category || "Other";
        if (!categories[category]) categories[category] = { count: 0, total: 0 };
        categories[category].count += 1;
        categories[category].total += Number(expense.amount || 0);
    });

    const expenseTable = document.getElementById("reportExpenseBreakdown");
    const expenseRows = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);

    if (expenseTable) {
        expenseTable.innerHTML = expenseRows.length
            ? expenseRows.map(([category, item]) => `
                <tr>
                    <td><strong>${escapeHTML(category)}</strong></td>
                    <td>${item.count}</td>
                    <td>${formatCurrency(item.total)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="3" class="table-empty">No expenses in this period</td></tr>`;
    }

    const activity = [
        ...periodSales.map(item => ({ type: "Sale", description: item.productName, amount: Number(item.total || 0), date: item.date, createdAt: item.createdAt })),
        ...periodPurchases.map(item => ({ type: "Purchase", description: item.productName, amount: Number(item.total || 0), date: item.date, createdAt: item.createdAt })),
        ...periodExpenses.map(item => ({ type: "Expense", description: item.name, amount: Number(item.amount || 0), date: item.date, createdAt: item.createdAt }))
    ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 12);

    const activityTable = document.getElementById("reportRecentActivity");
    if (activityTable) {
        activityTable.innerHTML = activity.length
            ? activity.map(item => `
                <tr>
                    <td><strong>${item.type}</strong></td>
                    <td>${escapeHTML(item.description)}</td>
                    <td>${formatCurrency(item.amount)}</td>
                    <td>${formatDate(item.date)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" class="table-empty">No activity in this period</td></tr>`;
    }
}

function setReportPeriod(period) {
    reportPeriod = period;
    reportStartDate = "";
    reportEndDate = "";

    const startInput = document.getElementById("reportStartDate");
    const endInput = document.getElementById("reportEndDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    document.querySelectorAll("[data-report-period]").forEach(button => {
        button.classList.toggle("active", button.dataset.reportPeriod === period);
    });

    renderReports();
}

document.querySelectorAll("[data-report-period]").forEach(button => {
    button.addEventListener("click", () => setReportPeriod(button.dataset.reportPeriod));
});

const applyReportDates = document.getElementById("applyReportDates");
if (applyReportDates) {
    applyReportDates.addEventListener("click", () => {
        const startInput = document.getElementById("reportStartDate");
        const endInput = document.getElementById("reportEndDate");
        const start = startInput?.value || "";
        const end = endInput?.value || "";

        if (start && end && start > end) {
            alert("The start date cannot be after the end date.");
            return;
        }

        reportStartDate = start;
        reportEndDate = end;
        reportPeriod = "custom";
        document.querySelectorAll("[data-report-period]").forEach(button => button.classList.remove("active"));
        renderReports();
    });
}

function refreshApplication() {

    renderInventory();

    renderDashboardInventory();

    renderLowStock();

    updateDashboardStats();

    renderPurchases();

    updatePurchaseStats();

    renderSales();

    updateSalesStats();

    renderExpenses();

    updateExpenseStats();

    renderReports();

}


    /* =====================================
       SEARCH
    ===================================== */

    inventorySearch.addEventListener(
        "input",
        renderInventory
    );


    categoryFilter.addEventListener(
        "change",
        renderInventory
    );


    stockFilter.addEventListener(
        "change",
        renderInventory
    );


    /* =====================================
       GLOBAL SEARCH
    ===================================== */

    globalSearch.addEventListener(
        "input",
        () => {

            const value =
                globalSearch.value
                    .toLowerCase()
                    .trim();


            if (!value) {
                return;
            }


            const found =
                products.some(
                    product =>
                        product.name
                            .toLowerCase()
                            .includes(value)
                );


            if (found) {

                navLinks.forEach(link => {

                    link.classList.remove(
                        "active"
                    );

                });


                const inventoryLink =
                    document.querySelector(
                        '[data-page="inventory"]'
                    );


                if (inventoryLink) {

                    inventoryLink.classList.add(
                        "active"
                    );

                }


                pages.forEach(page => {

                    page.classList.remove(
                        "active-page"
                    );

                });


                document
                    .getElementById("inventory")
                    .classList.add(
                        "active-page"
                    );


                inventorySearch.value =
                    globalSearch.value;


                renderInventory();

            }

        }
    );


    /* =====================================
       VIEW INVENTORY BUTTONS
    ===================================== */

    function goToInventory() {

        navLinks.forEach(link => {

            link.classList.remove(
                "active"
            );

        });


        const inventoryLink =
            document.querySelector(
                '[data-page="inventory"]'
            );


        inventoryLink.classList.add(
            "active"
        );


        pages.forEach(page => {

            page.classList.remove(
                "active-page"
            );

        });


        document
            .getElementById("inventory")
            .classList.add(
                "active-page"
            );


        renderInventory();

    }


    document
        .getElementById(
            "viewInventoryButton"
        )
        .addEventListener(
            "click",
            goToInventory
        );


    document
        .getElementById(
            "viewAllInventory"
        )
        .addEventListener(
            "click",
            goToInventory
        );


    /* =====================================
       SETTINGS
    ===================================== */

    const businessSettingsForm =
        document.getElementById("businessSettingsForm");

    const languageSetting =
        document.getElementById("languageSetting");

    const currencySetting =
        document.getElementById("currencySetting");

    const dateFormatSetting =
        document.getElementById("dateFormatSetting");

    const saveRegionalSettings =
        document.getElementById("saveRegionalSettings");

    const lowStockNotifications =
        document.getElementById("lowStockNotifications");

    const transactionNotifications =
        document.getElementById("transactionNotifications");

    const settingsAccountName =
        document.getElementById("settingsAccountName");

    const settingsAccountEmail =
        document.getElementById("settingsAccountEmail");

    const exportDataButton =
        document.getElementById("exportDataButton");

    const resetDataButton =
        document.getElementById("resetDataButton");

    const changePasswordButton =
        document.getElementById("changePasswordButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const saveAccountButton =
        document.getElementById("saveAccountButton");

    const accountDisplayName =
        document.getElementById("accountDisplayName");

    const accountEmail =
        document.getElementById("accountEmail");

    const settingsAvatar =
        document.getElementById("settingsAvatar");


    function loadSettings() {

        const businessSettings =
            JSON.parse(
                localStorage.getItem(
                    "stockManagerBusinessSettings"
                )
            ) || {};

        const regionalSettings =
            JSON.parse(
                localStorage.getItem(
                    "stockManagerRegionalSettings"
                )
            ) || {};

        const notificationSettings =
            JSON.parse(
                localStorage.getItem(
                    "stockManagerNotificationSettings"
                )
            ) || {};


        const storeName =
            document.getElementById("storeName");

        const storePhone =
            document.getElementById("storePhone");

        const storeEmail =
            document.getElementById("storeEmail");

        const storeLocation =
            document.getElementById("storeLocation");


        if (storeName) {
            storeName.value = businessSettings.storeName || "";
        }

        if (storePhone) {
            storePhone.value = businessSettings.phone || "";
        }

        if (storeEmail) {
            storeEmail.value = businessSettings.email || "";
        }

        if (storeLocation) {
            storeLocation.value = businessSettings.location || "";
        }

        if (languageSetting) {
            languageSetting.value = regionalSettings.language || "en";
        }

        if (currencySetting) {
            currencySetting.value = regionalSettings.currency || "KES";
        }

        if (dateFormatSetting) {
            dateFormatSetting.value = regionalSettings.dateFormat || "short";
        }

        if (lowStockNotifications) {
            lowStockNotifications.checked =
                notificationSettings.lowStock !== false;
        }

        if (transactionNotifications) {
            transactionNotifications.checked =
                notificationSettings.transactions !== false;
        }

        const accountSettings =
            JSON.parse(
                localStorage.getItem("stockManagerAccountSettings")
            ) || {};

        if (accountDisplayName) {
            accountDisplayName.value =
                accountSettings.displayName || "Administrator";
        }

        if (accountEmail) {
            accountEmail.value =
                accountSettings.email || "";
        }

        if (settingsAccountName) {
            settingsAccountName.textContent =
                accountSettings.displayName || "Administrator";
        }

        if (settingsAccountEmail) {
            settingsAccountEmail.textContent =
                accountSettings.email || "Administrator account";
        }

        if (settingsAvatar) {
            const name = accountSettings.displayName || "Administrator";
            settingsAvatar.textContent =
                name.split(/\s+/).map(part => part.charAt(0)).join("").slice(0, 2).toUpperCase();
        }

        if (businessSettings.storeName) {
            document.title = businessSettings.storeName + " - Stock Manager";
        }
    }


    if (businessSettingsForm) {
        businessSettingsForm.addEventListener("submit", event => {
            event.preventDefault();

            const businessSettings = {
                storeName: document.getElementById("storeName").value.trim(),
                phone: document.getElementById("storePhone").value.trim(),
                email: document.getElementById("storeEmail").value.trim(),
                location: document.getElementById("storeLocation").value.trim()
            };

            localStorage.setItem(
                "stockManagerBusinessSettings",
                JSON.stringify(businessSettings)
            );

            document.title =
                businessSettings.storeName
                    ? businessSettings.storeName + " - Stock Manager"
                    : "Stock Manager";

            alert("Business profile saved successfully.");
        });
    }


    if (saveRegionalSettings) {
        saveRegionalSettings.addEventListener("click", () => {

            const regionalSettings = {
                language: languageSetting ? languageSetting.value : "en",
                currency: currencySetting ? currencySetting.value : "KES",
                dateFormat: dateFormatSetting ? dateFormatSetting.value : "short"
            };

            localStorage.setItem(
                "stockManagerRegionalSettings",
                JSON.stringify(regionalSettings)
            );

            document.documentElement.lang =
                regionalSettings.language === "sw" ? "sw" : "en";

            alert(
                regionalSettings.language === "sw"
                    ? "Mipangilio ya lugha na eneo imehifadhiwa."
                    : "Regional settings saved successfully."
            );
        });
    }


    function saveNotificationSettings() {
        localStorage.setItem(
            "stockManagerNotificationSettings",
            JSON.stringify({
                lowStock: lowStockNotifications ? lowStockNotifications.checked : true,
                transactions: transactionNotifications ? transactionNotifications.checked : true
            })
        );
    }


    if (lowStockNotifications) {
        lowStockNotifications.addEventListener("change", saveNotificationSettings);
    }

    if (transactionNotifications) {
        transactionNotifications.addEventListener("change", saveNotificationSettings);
    }


    if (exportDataButton) {
        exportDataButton.addEventListener("click", () => {

            const backup = {
                exportedAt: new Date().toISOString(),
                products: JSON.parse(localStorage.getItem("stockManagerProducts")) || [],
                purchases: JSON.parse(localStorage.getItem("stockManagerPurchases")) || [],
                sales: JSON.parse(localStorage.getItem("stockManagerSales")) || [],
                expenses: JSON.parse(localStorage.getItem("stockManagerExpenses")) || [],
                business: JSON.parse(localStorage.getItem("stockManagerBusinessSettings")) || {},
                regional: JSON.parse(localStorage.getItem("stockManagerRegionalSettings")) || {},
                notifications: JSON.parse(localStorage.getItem("stockManagerNotificationSettings")) || {},
                account: JSON.parse(localStorage.getItem("stockManagerAccountSettings")) || {}
            };

            const blob = new Blob(
                [JSON.stringify(backup, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `stock-manager-backup-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        });
    }


    if (resetDataButton) {
        resetDataButton.addEventListener("click", () => {

            const confirmed = confirm(
                "This will permanently delete your Stock Manager data. Continue?"
            );

            if (!confirmed) {
                return;
            }

            const finalConfirmation = confirm(
                "Are you absolutely sure? Export a backup first if you need your data."
            );

            if (!finalConfirmation) {
                return;
            }

            [
                "stockManagerProducts",
                "stockManagerPurchases",
                "stockManagerSales",
                "stockManagerExpenses",
                "stockManagerBusinessSettings",
                "stockManagerAccountSettings",
                "stockManagerRegionalSettings",
                "stockManagerNotificationSettings"
            ].forEach(key => localStorage.removeItem(key));

            alert("Application data has been reset.");
            location.reload();
        });
    }


    if (saveAccountButton) {
        saveAccountButton.addEventListener("click", () => {

            const displayName =
                accountDisplayName ? accountDisplayName.value.trim() : "Administrator";

            const email =
                accountEmail ? accountEmail.value.trim() : "";

            if (!displayName) {
                alert("Please enter an account display name.");
                return;
            }

            const accountSettings = {
                displayName,
                email
            };

            localStorage.setItem(
                "stockManagerAccountSettings",
                JSON.stringify(accountSettings)
            );

            if (settingsAccountName) {
                settingsAccountName.textContent = displayName;
            }

            if (settingsAccountEmail) {
                settingsAccountEmail.textContent = email || "Administrator account";
            }

            if (settingsAvatar) {
                settingsAvatar.textContent =
                    displayName.split(/\s+/).map(part => part.charAt(0)).join("").slice(0, 2).toUpperCase();
            }

            alert("Account profile saved successfully.");
        });
    }


    if (changePasswordButton) {
        changePasswordButton.addEventListener("click", () => {
            openAuthGate();
            showAuthView(changePasswordView);
        });
    }


    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            const confirmed = confirm("Log out of Stock Manager on this device?");
            if (confirmed) logout();
        });
    }


    loadSettings();



    /* =====================================
       PROFESSIONAL STORE FEATURES — STAGE 4
    ===================================== */

    function getBusinessProfile() {
        try {
            return JSON.parse(
                localStorage.getItem("stockManagerBusinessSettings")
            ) || {};
        } catch (error) {
            return {};
        }
    }

    function csvEscape(value) {
        const text = value === null || value === undefined ? "" : String(value);
        return `"${text.replace(/"/g, '""')}"`;
    }

    function downloadCsv(filename, headers, rows) {
        const csv = [
            headers.map(csvEscape).join(","),
            ...rows.map(row => row.map(csvEscape).join(","))
        ].join("\r\n");

        const blob = new Blob(["\ufeff" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function printDocument(title, bodyHtml) {
        const business = getBusinessProfile();
        const storeName = business.storeName || "Stock Manager";
        const phone = business.phone || "";
        const email = business.email || "";
        const location = business.location || "";

        const printWindow = window.open("", "_blank", "width=800,height=900");

        if (!printWindow) {
            alert("Please allow pop-ups to print this document.");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${escapeHTML(title)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 30px;
                        color: #111827;
                        background: #fff;
                    }
                    .receipt {
                        max-width: 700px;
                        margin: 0 auto;
                    }
                    .brand {
                        text-align: center;
                        border-bottom: 2px solid #111827;
                        padding-bottom: 18px;
                        margin-bottom: 20px;
                    }
                    .brand h1 { margin: 0 0 6px; font-size: 28px; }
                    .brand p { margin: 3px 0; color: #4b5563; }
                    h2 { margin: 0 0 18px; text-align: center; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 18px 0;
                    }
                    th, td {
                        padding: 10px 8px;
                        border-bottom: 1px solid #e5e7eb;
                        text-align: left;
                    }
                    th { background: #f3f4f6; }
                    .total {
                        display: flex;
                        justify-content: space-between;
                        font-size: 20px;
                        font-weight: 700;
                        padding: 15px 0;
                        border-top: 2px solid #111827;
                    }
                    .meta {
                        margin: 18px 0;
                        color: #374151;
                        line-height: 1.6;
                    }
                    .footer {
                        margin-top: 35px;
                        text-align: center;
                        color: #6b7280;
                        font-size: 12px;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="brand">
                        <h1>${escapeHTML(storeName)}</h1>
                        ${phone ? `<p>${escapeHTML(phone)}</p>` : ""}
                        ${email ? `<p>${escapeHTML(email)}</p>` : ""}
                        ${location ? `<p>${escapeHTML(location)}</p>` : ""}
                    </div>
                    ${bodyHtml}
                    <div class="footer">
                        Generated by Stock Manager • ${new Date().toLocaleString("en-KE")}
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    function printSaleReceipt(id) {
        const sale = sales.find(item => item.id === id);
        if (!sale) {
            alert("Sale record could not be found.");
            return;
        }

        const body = `
            <h2>Sales Receipt</h2>
            <div class="meta">
                <strong>Receipt #:</strong> ${sale.id}<br>
                <strong>Date:</strong> ${formatDate(sale.date)}<br>
                <strong>Customer:</strong> ${sale.customer ? escapeHTML(sale.customer) : "Walk-in Customer"}
            </div>
            <table>
                <thead>
                    <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${escapeHTML(sale.productName)}</td>
                        <td>${sale.quantity}</td>
                        <td>${formatCurrency(sale.unitPrice)}</td>
                        <td>${formatCurrency(sale.total)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="total">
                <span>Total</span>
                <span>${formatCurrency(sale.total)}</span>
            </div>
        `;

        printDocument("Sales Receipt #" + sale.id, body);
    }

    function printPurchaseRecord(id) {
        const purchase = purchases.find(item => item.id === id);
        if (!purchase) {
            alert("Purchase record could not be found.");
            return;
        }

        const body = `
            <h2>Purchase Record</h2>
            <div class="meta">
                <strong>Purchase #:</strong> ${purchase.id}<br>
                <strong>Date:</strong> ${formatDate(purchase.date)}<br>
                <strong>Supplier:</strong> ${purchase.supplier ? escapeHTML(purchase.supplier) : "—"}<br>
                <strong>Reference:</strong> ${purchase.reference ? escapeHTML(purchase.reference) : "—"}
            </div>
            <table>
                <thead>
                    <tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${escapeHTML(purchase.productName)}</td>
                        <td>${purchase.quantity}</td>
                        <td>${formatCurrency(purchase.unitCost)}</td>
                        <td>${formatCurrency(purchase.total)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="total">
                <span>Total Purchase</span>
                <span>${formatCurrency(purchase.total)}</span>
            </div>
        `;

        printDocument("Purchase Record #" + purchase.id, body);
    }

    function printExpenseRecord(id) {
        const expense = expenses.find(item => item.id === id);
        if (!expense) {
            alert("Expense record could not be found.");
            return;
        }

        const body = `
            <h2>Expense Record</h2>
            <div class="meta">
                <strong>Expense #:</strong> ${expense.id}<br>
                <strong>Date:</strong> ${formatDate(expense.date)}<br>
                <strong>Category:</strong> ${escapeHTML(expense.category)}
            </div>
            <table>
                <thead>
                    <tr><th>Expense</th><th>Description</th><th>Amount</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${escapeHTML(expense.name)}</td>
                        <td>${expense.description ? escapeHTML(expense.description) : "—"}</td>
                        <td>${formatCurrency(expense.amount)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="total">
                <span>Total Expense</span>
                <span>${formatCurrency(expense.amount)}</span>
            </div>
        `;

        printDocument("Expense Record #" + expense.id, body);
    }

    function exportSalesCsv() {
        if (!sales.length) {
            alert("There are no sales to export.");
            return;
        }

        const rows = [...sales]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(sale => [
                sale.id,
                sale.productName,
                sale.quantity,
                sale.unitPrice,
                sale.total,
                sale.customer || "",
                sale.date
            ]);

        downloadCsv(
            "stock-manager-sales.csv",
            ["ID", "Product", "Quantity", "Unit Price", "Total", "Customer", "Date"],
            rows
        );
    }

    function exportPurchasesCsv() {
        if (!purchases.length) {
            alert("There are no purchases to export.");
            return;
        }

        const rows = [...purchases]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(purchase => [
                purchase.id,
                purchase.productName,
                purchase.quantity,
                purchase.unitCost,
                purchase.total,
                purchase.supplier || "",
                purchase.date,
                purchase.reference || ""
            ]);

        downloadCsv(
            "stock-manager-purchases.csv",
            ["ID", "Product", "Quantity", "Unit Cost", "Total", "Supplier", "Date", "Reference"],
            rows
        );
    }

    function exportExpensesCsv() {
        if (!expenses.length) {
            alert("There are no expenses to export.");
            return;
        }

        const rows = [...expenses]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(expense => [
                expense.id,
                expense.name,
                expense.category,
                expense.amount,
                expense.description || "",
                expense.date
            ]);

        downloadCsv(
            "stock-manager-expenses.csv",
            ["ID", "Expense", "Category", "Amount", "Description", "Date"],
            rows
        );
    }

    function exportInventoryCsv() {
        if (!products.length) {
            alert("There are no products to export.");
            return;
        }

        const rows = products.map(product => [
            product.id,
            product.name,
            product.category,
            product.quantity,
            product.lowStockLimit,
            product.buyingPrice,
            product.sellingPrice,
            Number(product.quantity || 0) * Number(product.buyingPrice || 0),
            getProductStatus(product).text
        ]);

        downloadCsv(
            "stock-manager-inventory.csv",
            ["ID", "Product", "Category", "Quantity", "Low Stock Limit", "Buying Price", "Selling Price", "Stock Value", "Status"],
            rows
        );
    }

    function exportReportCsv() {
        const business = getBusinessProfile();
        const reportRows = [];

        const start = reportStartDate || "";
        const end = reportEndDate || "";

        reportRows.push(["Stock Manager Report"]);
        reportRows.push(["Store", business.storeName || "Stock Manager"]);
        reportRows.push(["Generated", new Date().toLocaleString("en-KE")]);
        reportRows.push(["From", start || "All Time"]);
        reportRows.push(["To", end || "All Time"]);
        reportRows.push([]);

        const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
        const purchaseTotal = purchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
        const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

        reportRows.push(["Summary"]);
        reportRows.push(["Sales Revenue", revenue]);
        reportRows.push(["Purchases", purchaseTotal]);
        reportRows.push(["Expenses", expenseTotal]);
        reportRows.push(["Net Profit", revenue - purchaseTotal - expenseTotal]);
        reportRows.push([]);
        reportRows.push(["Sales"]);
        reportRows.push(["ID", "Product", "Quantity", "Unit Price", "Total", "Customer", "Date"]);
        sales.forEach(sale => reportRows.push([
            sale.id, sale.productName, sale.quantity, sale.unitPrice, sale.total, sale.customer || "", sale.date
        ]));
        reportRows.push([]);
        reportRows.push(["Purchases"]);
        reportRows.push(["ID", "Product", "Quantity", "Unit Cost", "Total", "Supplier", "Date", "Reference"]);
        purchases.forEach(purchase => reportRows.push([
            purchase.id, purchase.productName, purchase.quantity, purchase.unitCost, purchase.total,
            purchase.supplier || "", purchase.date, purchase.reference || ""
        ]));
        reportRows.push([]);
        reportRows.push(["Expenses"]);
        reportRows.push(["ID", "Expense", "Category", "Amount", "Description", "Date"]);
        expenses.forEach(expense => reportRows.push([
            expense.id, expense.name, expense.category, expense.amount, expense.description || "", expense.date
        ]));

        const csv = reportRows
            .map(row => row.map(csvEscape).join(","))
            .join("\r\n");

        const blob = new Blob(["\ufeff" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `stock-manager-report-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function addProfessionalExportButtonToInventory() {
        const inventoryPage = document.getElementById("inventory");
        if (!inventoryPage || document.getElementById("exportInventoryCsvButton")) return;

        const header = inventoryPage.querySelector(".page-header");
        if (!header) return;

        const existingActions = header.querySelector(".page-header-actions");
        const buttonWrap = existingActions || document.createElement("div");
        buttonWrap.className = "page-header-actions";

        // Keep the Add Product and Export CSV buttons together on the right.
        const addButton = document.getElementById("inventoryAddButton");
        if (addButton && addButton.parentElement === header) {
            buttonWrap.appendChild(addButton);
        }

        const button = document.createElement("button");
        button.id = "exportInventoryCsvButton";
        button.type = "button";
        button.className = "secondary-button";
        button.textContent = "📥 Export CSV";
        button.addEventListener("click", exportInventoryCsv);

        if (!header.querySelector(".page-header-actions")) {
            header.appendChild(buttonWrap);
        }
        buttonWrap.insertBefore(button, buttonWrap.firstChild);
    }

    const exportSalesCsvButton = document.getElementById("exportSalesCsvButton");
    if (exportSalesCsvButton) {
        exportSalesCsvButton.addEventListener("click", exportSalesCsv);
    }

    const exportPurchasesCsvButton = document.getElementById("exportPurchasesCsvButton");
    if (exportPurchasesCsvButton) {
        exportPurchasesCsvButton.addEventListener("click", exportPurchasesCsv);
    }

    const exportExpensesCsvButton = document.getElementById("exportExpensesCsvButton");
    if (exportExpensesCsvButton) {
        exportExpensesCsvButton.addEventListener("click", exportExpensesCsv);
    }

    const exportReportCsvButton = document.getElementById("exportReportCsvButton");
    if (exportReportCsvButton) {
        exportReportCsvButton.addEventListener("click", exportReportCsv);
    }

    addProfessionalExportButtonToInventory();

    window.printSaleReceipt = printSaleReceipt;
    window.printPurchaseRecord = printPurchaseRecord;
    window.printExpenseRecord = printExpenseRecord;

    /* =====================================
       GLOBAL FUNCTIONS
    ===================================== */

    window.editProduct =
        editProduct;

    window.deleteProduct =
        deleteProduct;


    /* =====================================
       INITIAL LOAD
    ===================================== */
    refreshApplication();

});
