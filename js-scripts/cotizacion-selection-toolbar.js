/**
 * Toolbar contextual estilo Gmail para la tabla de ítems de cotización.
 * - Al marcar checkboxes, la toolbar normal se reemplaza por la de selección.
 * - Acciones masivas: Descuento, Envío, Cargar cantidades y Eliminar sobre los ítems seleccionados.
 */
document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.querySelector("table.table tbody");
    const toolbarDefault = document.getElementById("tableToolbarDefault");
    const toolbarSelection = document.getElementById("tableToolbarSelection");
    const selectionCount = document.getElementById("selectionCount");

    if (!tbody || !toolbarDefault || !toolbarSelection) return;

    /* ---------- Helpers de formato (es-AR: $8.455,00) ---------- */

    function parseMoney(text) {
        if (!text) return NaN;
        const clean = text.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
        return parseFloat(clean);
    }

    function formatMoney(value) {
        return (
            "$" +
            new Intl.NumberFormat("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value)
        );
    }

    function formatMoneyShort(value) {
        return (
            "$" +
            new Intl.NumberFormat("es-AR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(value)
        );
    }

    function getSelectedRows() {
        if (window.cotizacionSelection) return window.cotizacionSelection.getSelectedRows();
        return Array.from(tbody.querySelectorAll("tr.item-container")).filter((row) => {
            const cb = row.querySelector(".item-row-checkbox");
            return cb && cb.checked;
        });
    }

    function clearSelection() {
        if (window.cotizacionSelection) {
            window.cotizacionSelection.clearSelection();
        }
    }

    /* ---------- Swap de toolbar + highlight de filas ---------- */

    function syncToolbarState(count) {
        const hasSelection = count > 0;
        toolbarDefault.classList.toggle("d-none", hasSelection);
        toolbarSelection.classList.toggle("d-none", !hasSelection);
        if (selectionCount) {
            selectionCount.textContent = count === 1 ? "1 seleccionado" : `${count} seleccionados`;
        }
        tbody.querySelectorAll("tr.item-container").forEach((row) => {
            const cb = row.querySelector(".item-row-checkbox");
            row.classList.toggle("row-selected", Boolean(cb && cb.checked));
        });
    }

    document.addEventListener("cotizacion-selection-changed", (e) => {
        syncToolbarState(e.detail ? e.detail.count : getSelectedRows().length);
    });

    const btnClear = document.getElementById("btnClearSelection");
    if (btnClear) btnClear.addEventListener("click", clearSelection);

    /* ---------- Eliminar seleccionados ---------- */

    const btnEliminar = document.getElementById("btnEliminarItemsSeleccionados");
    if (btnEliminar) {
        btnEliminar.addEventListener("click", () => {
            getSelectedRows().forEach((row) => row.remove());
            if (typeof window.syncCotizacionItemOrderAfterReorder === "function") {
                window.syncCotizacionItemOrderAfterReorder();
            }
            if (window.cotizacionSelection) window.cotizacionSelection.refresh();
        });
    }

    /* ---------- Setup para seleccionados ---------- */

    const btnAplicarSetup = document.getElementById("btnAplicarSetupSeleccion");
    const setupInput = document.getElementById("precioExtraImpresion");
    const btnSetupDropdown = document.getElementById("btnSetupSeleccion");

    function applySetupToRow(row, amount) {
        const nameEl = row.querySelector(".product-name-main");
        if (!nameEl) return;
        let badge = nameEl.querySelector(".setup-badge");
        if (amount > 0) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "setup-badge";
                nameEl.appendChild(badge);
            }
            badge.textContent = `Setup ${formatMoneyShort(amount)}`;
        } else if (badge) {
            badge.remove();
        }
    }

    if (btnAplicarSetup && setupInput) {
        btnAplicarSetup.addEventListener("click", () => {
            const amount = Math.max(0, parseFloat(setupInput.value) || 0);
            getSelectedRows().forEach((row) => applySetupToRow(row, amount));
            if (btnSetupDropdown && window.bootstrap) {
                bootstrap.Dropdown.getOrCreateInstance(btnSetupDropdown).hide();
            }
            clearSelection();
        });
    }

    /* ---------- Descuento para seleccionados ---------- */

    const btnAplicarDescuento = document.getElementById("btnAplicarDescuentoSeleccion");
    const descuentoInput = document.getElementById("descuentoSeleccionInput");
    const btnDescuentoDropdown = document.getElementById("btnDescuentoSeleccion");

    function applyDiscountToRow(row, pct) {
        row.querySelectorAll(".precio-tag, .subtotal-tag").forEach((tag) => {
            if (!tag.dataset.original) tag.dataset.original = tag.textContent.trim();
            const original = parseMoney(tag.dataset.original);
            if (isNaN(original)) return;
            if (pct > 0) {
                tag.textContent = formatMoney(original * (1 - pct / 100));
            } else {
                tag.textContent = tag.dataset.original;
                delete tag.dataset.original;
            }
        });

        const nameEl = row.querySelector(".product-name-main");
        if (nameEl) {
            let badge = nameEl.querySelector(".discount-badge");
            if (pct > 0) {
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "discount-badge";
                    nameEl.appendChild(badge);
                }
                badge.textContent = `\u2212${pct}%`;
            } else if (badge) {
                badge.remove();
            }
        }
    }

    if (btnAplicarDescuento && descuentoInput) {
        btnAplicarDescuento.addEventListener("click", () => {
            const pct = Math.min(100, Math.max(0, parseFloat(descuentoInput.value) || 0));
            getSelectedRows().forEach((row) => applyDiscountToRow(row, pct));
            descuentoInput.value = "";
            if (btnDescuentoDropdown && window.bootstrap) {
                bootstrap.Dropdown.getOrCreateInstance(btnDescuentoDropdown).hide();
            }
            clearSelection();
        });
    }

    /* ---------- Información de envío para seleccionados ---------- */

    const btnAplicarEnvio = document.getElementById("btnAplicarEnvioSeleccion");
    const envioInput = document.getElementById("informacionEnvioSeleccionInput");
    const btnEnvioDropdown = document.getElementById("btnEnvioSeleccion");

    function applyEnvioToRow(row, text) {
        const value = (text || "").trim();
        if (value) {
            row.dataset.informacionEnvio = value;
        } else {
            delete row.dataset.informacionEnvio;
        }

        const nameEl = row.querySelector(".product-name-main");
        if (!nameEl) return;
        let badge = nameEl.querySelector(".envio-badge");
        if (value) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "envio-badge";
                nameEl.appendChild(badge);
            }
            badge.textContent = value;
            badge.title = value;
        } else if (badge) {
            badge.remove();
        }
    }

    if (btnAplicarEnvio && envioInput) {
        btnAplicarEnvio.addEventListener("click", () => {
            const value = envioInput.value.trim();
            getSelectedRows().forEach((row) => applyEnvioToRow(row, value));
            envioInput.value = "";
            if (btnEnvioDropdown && window.bootstrap) {
                bootstrap.Dropdown.getOrCreateInstance(btnEnvioDropdown).hide();
            }
            clearSelection();
        });
    }

    /* ---------- Cargar cantidades: contexto y alcance (selección vs global) ---------- */

    // "selection": ítems marcados en la tabla. "global" (Cotizar rápido): todos los productos.
    let cantidadesScope = "selection";

    function resolveScope(trigger) {
        return trigger && trigger.dataset && trigger.dataset.scope === "global"
            ? "global"
            : "selection";
    }

    function updateSelectionContext(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.classList.toggle("context-global", cantidadesScope === "global");
        const strong = container.querySelector("strong");
        if (!strong) return;
        if (cantidadesScope === "global") {
            strong.textContent = "todos los productos de la cotización";
        } else {
            const count = getSelectedRows().length;
            strong.textContent =
                count === 1 ? "1 ítem seleccionado" : `${count} ítems seleccionados`;
        }
    }

    function getScopeRows() {
        if (cantidadesScope === "global") {
            return Array.from(tbody.querySelectorAll("tr.item-container"));
        }
        return getSelectedRows();
    }

    const modalCantidades = document.getElementById("modalMasElementos");
    if (modalCantidades) {
        modalCantidades.addEventListener("show.bs.modal", (e) => {
            cantidadesScope = resolveScope(e.relatedTarget);
            updateSelectionContext("modalMasElementosContext");
        });
    }

    const sidebarCantidades = document.getElementById("sidebarMasElementos");
    if (sidebarCantidades) {
        sidebarCantidades.addEventListener("show.bs.offcanvas", (e) => {
            cantidadesScope = resolveScope(e.relatedTarget);
            updateSelectionContext("sidebarMasElementosContext");
        });
    }

    /* ---------- Cargar cantidades: aplicar a filas seleccionadas ---------- */

    function getRowBasePrice(row) {
        if (row.dataset.basePrice) return parseFloat(row.dataset.basePrice);
        const firstPrecio = row.querySelector(".productPrecioUnitario .precio-tag");
        const base = firstPrecio
            ? parseMoney(firstPrecio.dataset.original || firstPrecio.textContent)
            : NaN;
        if (!isNaN(base)) row.dataset.basePrice = String(base);
        return base;
    }

    function rebuildTags(container, className, values) {
        if (!container) return;
        Array.from(container.children)
            .filter((el) => el.classList.contains(className))
            .forEach((el) => el.remove());
        const anchor = container.querySelector(".mini-table");
        values.forEach((text) => {
            const div = document.createElement("div");
            div.className = className;
            div.textContent = text;
            container.insertBefore(div, anchor || null);
        });
    }

    function rebuildMiniSection(row, sectionIndex, className, values) {
        const sections = row.querySelectorAll(".mini-table .mini-section");
        const section = sections[sectionIndex];
        if (!section) return;
        const content = section.querySelector(".mini-content");
        if (!content) return;
        content.innerHTML = "";
        values.forEach((text) => {
            const div = document.createElement("div");
            div.className = className;
            div.textContent = text;
            content.appendChild(div);
        });
    }

    function applyQuantitiesToRow(row, quantities) {
        const basePrice = getRowBasePrice(row);

        const qtyTexts = quantities.map((q) => `x${q}`);
        const precioTexts = quantities.map(() => (isNaN(basePrice) ? "—" : formatMoney(basePrice)));
        const subtotalTexts = quantities.map((q) =>
            isNaN(basePrice) ? "—" : formatMoney(basePrice * q)
        );

        rebuildTags(row.querySelector(".productQuantities"), "quantities-tag", qtyTexts);
        rebuildTags(row.querySelector(".productPrecioUnitario"), "precio-tag", precioTexts);
        rebuildTags(row.querySelector(".productSubtotal"), "subtotal-tag", subtotalTexts);

        rebuildMiniSection(row, 0, "quantities-tag", qtyTexts);
        rebuildMiniSection(row, 1, "precio-tag", precioTexts);
        rebuildMiniSection(row, 2, "subtotal-tag", subtotalTexts);

        // Las cantidades reemplazan la configuración previa: se quitan los badges
        row.querySelectorAll(".product-name-main .discount-badge, .product-name-main .setup-badge").forEach((badge) => badge.remove());
    }

    function applyQuantitiesToScope(quantities) {
        const valid = quantities
            .map((q) => parseInt(q, 10))
            .filter((q) => !isNaN(q) && q > 0)
            .sort((a, b) => a - b);
        if (valid.length === 0) return false;
        getScopeRows().forEach((row) => applyQuantitiesToRow(row, valid));
        return true;
    }

    /* --- Desktop: modal #modalMasElementos --- */

    const modalTableBody = modalCantidades
        ? modalCantidades.querySelector("table.table-modal tbody")
        : null;

    let modalRowTemplate = null;
    if (modalTableBody && modalTableBody.querySelector("tr")) {
        modalRowTemplate = modalTableBody.querySelector("tr").cloneNode(true);
        modalRowTemplate.querySelectorAll("input").forEach((input) => {
            input.value = "";
            input.removeAttribute("value");
        });
    }

    const btnAgregarCantidadDesktop = document.getElementById("agregarCantidadDesktop");
    if (btnAgregarCantidadDesktop && modalTableBody && modalRowTemplate) {
        btnAgregarCantidadDesktop.addEventListener("click", () => {
            const newRow = modalRowTemplate.cloneNode(true);
            modalTableBody.appendChild(newRow);
            const firstInput = newRow.querySelector("input");
            if (firstInput) firstInput.focus();
        });
    }

    if (modalTableBody) {
        modalTableBody.addEventListener("click", (e) => {
            const deleteBtn = e.target.closest(".delete-btn");
            if (!deleteBtn) return;
            const tr = deleteBtn.closest("tr");
            if (tr) tr.remove();
        });
    }

    const btnGuardarDesktop = document.getElementById("guardarCantidadesDesktop");
    if (btnGuardarDesktop && modalTableBody) {
        btnGuardarDesktop.addEventListener("click", () => {
            const quantities = Array.from(
                modalTableBody.querySelectorAll('input[name="colCotizacionCantidad"]')
            ).map((input) => input.value);
            if (!applyQuantitiesToScope(quantities)) return;
            if (window.bootstrap) {
                bootstrap.Modal.getOrCreateInstance(modalCantidades).hide();
            }
            if (cantidadesScope !== "global") clearSelection();
        });
    }

    /* --- Mobile: offcanvas #sidebarMasElementos --- */

    const savedQuantities = sidebarCantidades
        ? sidebarCantidades.querySelector(".saved-quantities")
        : null;

    const btnAgregarNested = document.getElementById("btnAgregarCantidadNested");
    if (btnAgregarNested && savedQuantities) {
        btnAgregarNested.addEventListener("click", () => {
            const nestedBody = sidebarCantidades.querySelector(".nested-sidebar-body");
            if (!nestedBody) return;
            const getValue = (name) => {
                const input = nestedBody.querySelector(`[name="${name}"]`);
                return input ? input.value.trim() : "";
            };

            const cantidad = parseInt(getValue("colCotizacionCantidad"), 10);
            if (isNaN(cantidad) || cantidad <= 0) return;

            const fields = [
                ["Cantidad", String(cantidad)],
                ["Costo extra", getValue("colCotizacionCostoExtra")],
                ["Margen", getValue("colCotizacionMargen")],
                ["Descuento", getValue("colCotizacionDescuento")],
                ["Financiación", getValue("colCotizacionFinanciacion")]
            ];

            const card = document.createElement("div");
            card.className = "quantities-card";
            card.dataset.cantidad = String(cantidad);
            fields.forEach(([label, value]) => {
                const div = document.createElement("div");
                div.className = "fieldLabel";
                div.append(`${label}: `);
                const span = document.createElement("span");
                span.className = "fieldValue";
                span.textContent = value;
                div.appendChild(span);
                card.appendChild(div);
            });
            const actions = document.createElement("div");
            actions.className = "action-buttons";
            actions.innerHTML =
                '<button type="button" class="edit-btn-mobile" data-itemid="#"><span>Editar</span></button>' +
                '<button type="button" class="delete-btn-mobile"><span>Eliminar</span></button>';
            card.appendChild(actions);
            savedQuantities.appendChild(card);

            nestedBody.querySelectorAll("input").forEach((input) => (input.value = ""));
            const btnBack = document.getElementById("btnBackNestedSidebar");
            if (btnBack) btnBack.click();
        });
    }

    if (savedQuantities) {
        savedQuantities.addEventListener("click", (e) => {
            const deleteBtn = e.target.closest(".delete-btn-mobile");
            if (!deleteBtn) return;
            const card = deleteBtn.closest(".quantities-card");
            if (card) card.remove();
        });
    }

    const btnGuardarMobile = document.getElementById("guardarCantidadesMobile");
    if (btnGuardarMobile && savedQuantities) {
        btnGuardarMobile.addEventListener("click", () => {
            const quantities = Array.from(
                savedQuantities.querySelectorAll(".quantities-card")
            ).map((card) => {
                if (card.dataset.cantidad) return card.dataset.cantidad;
                const firstValue = card.querySelector(".fieldLabel .fieldValue");
                return firstValue ? firstValue.textContent.trim() : "";
            });
            if (!applyQuantitiesToScope(quantities)) return;
            if (window.bootstrap) {
                bootstrap.Offcanvas.getOrCreateInstance(sidebarCantidades).hide();
            }
            if (cantidadesScope !== "global") clearSelection();
        });
    }

    /* ---------- Estado inicial ---------- */
    syncToolbarState(getSelectedRows().length);
});
