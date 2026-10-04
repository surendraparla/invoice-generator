/**
 * catalog.js - Catalog Management & Excel Importer/Exporter
 * Fully offline catalog management with HSN code, UOM, and Item-level Discounts.
 */

class CatalogManager {
    constructor() {
        this.items = [];
        this.filteredItems = [];
        this.selectedCategory = 'all';
        this.searchQuery = '';
        this.pendingImportData = null;
    }

    init() {
        this.loadCatalog();
        this.setupEventListeners();
    }

    loadCatalog() {
        this.items = window.appStorage.getCatalog();
        this.applyFilter();
        this.renderCategoryFilter();
    }

    applyFilter() {
        const query = this.searchQuery.toLowerCase().trim();
        this.filteredItems = this.items.filter(item => {
            const matchesCategory = this.selectedCategory === 'all' || item.category === this.selectedCategory;
            const matchesSearch = !query ||
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.sku && item.sku.toLowerCase().includes(query)) ||
                (item.hsn && item.hsn.toLowerCase().includes(query)) ||
                (item.category && item.category.toLowerCase().includes(query)) ||
                (item.description && item.description.toLowerCase().includes(query));
            return matchesCategory && matchesSearch;
        });
        this.renderTable();
    }

    renderCategoryFilter() {
        const select = document.getElementById('catalogCategoryFilter');
        if (!select) return;

        const categories = [...new Set(this.items.map(item => item.category).filter(Boolean))].sort();
        const currentVal = this.selectedCategory;

        select.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            if (cat === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    renderTable() {
        const tbody = document.getElementById('catalogTableBody');
        const countBadge = document.getElementById('catalogItemCount');
        if (!tbody) return;

        if (countBadge) {
            countBadge.textContent = `${this.filteredItems.length} of ${this.items.length} items`;
        }

        if (this.filteredItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-state-content">
                            <span class="empty-icon">📦</span>
                            <h4>No Catalog Items Found</h4>
                            <p>${this.items.length === 0 ? 'Your catalog is empty. Import an Excel spreadsheet or add items manually.' : 'No items match your filter.'}</p>
                            ${this.items.length === 0 ? '<button class="btn btn-primary btn-sm" onclick="window.catalogManager.openAddModal()">+ Add First Item</button>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const currency = window.appStorage.getSettings().currencySymbol || '₹';

        tbody.innerHTML = this.filteredItems.map(item => `
            <tr data-id="${item.id}">
                <td><code class="sku-badge">${this.escapeHtml(item.hsn || '85469010')}</code></td>
                <td>
                    <div class="item-name-cell">
                        <strong>${this.escapeHtml(item.name)}</strong>
                        ${item.sku ? `<small class="text-muted d-block">SKU: ${this.escapeHtml(item.sku)}</small>` : ''}
                    </div>
                </td>
                <td><span class="category-pill">${this.escapeHtml(item.category || 'General')}</span></td>
                <td><span class="unit-text">${this.escapeHtml(item.unit || 'Nos')}</span></td>
                <td class="text-right"><strong>${currency}${parseFloat(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td class="text-right">${parseFloat(item.defaultDiscount || 0)}%</td>
                <td class="text-right">${parseFloat(item.taxRate || 18)}%</td>
                <td class="text-center actions-cell">
                    <button class="btn-icon" title="Add to active invoice" onclick="window.catalogManager.addToActiveInvoice('${item.id}')">
                        ➕
                    </button>
                    <button class="btn-icon" title="Edit Item" onclick="window.catalogManager.openEditModal('${item.id}')">
                        ✏️
                    </button>
                    <button class="btn-icon btn-danger-icon" title="Delete Item" onclick="window.catalogManager.deleteItem('${item.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }

    setupEventListeners() {
        const searchInput = document.getElementById('catalogSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.applyFilter();
            });
        }

        const categoryFilter = document.getElementById('catalogCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.selectedCategory = e.target.value;
                this.applyFilter();
            });
        }

        const excelInput = document.getElementById('catalogExcelFileInput');
        if (excelInput) {
            excelInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleExcelFile(file);
                }
                e.target.value = '';
            });
        }
    }

    // --- Excel Import & Smart Column Mapping ---
    handleExcelFile(file) {
        if (!window.XLSX) {
            window.showToast('SheetJS library is loading, please try again in a moment.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (!rawJson || rawJson.length === 0) {
                    window.showToast('The selected file contains no readable data rows.', 'error');
                    return;
                }

                this.parseAndPreviewImport(rawJson, file.name);
            } catch (err) {
                console.error('Error parsing spreadsheet:', err);
                window.showToast('Failed to parse file: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    parseAndPreviewImport(rawRows, fileName) {
        const sampleRow = rawRows[0];
        const keys = Object.keys(sampleRow);
        const mapping = this.detectColumnMapping(keys);

        const mappedItems = rawRows.map(row => {
            const getVal = (field) => mapping[field] ? String(row[mapping[field]] ?? '').trim() : '';

            let priceRaw = getVal('price').replace(/[^0-9.-]/g, '');
            const price = parseFloat(priceRaw) || 0;

            let taxRaw = getVal('taxRate').replace(/[^0-9.-]/g, '');
            const taxRate = parseFloat(taxRaw) || 18;

            let discRaw = getVal('defaultDiscount').replace(/[^0-9.-]/g, '');
            const defaultDiscount = parseFloat(discRaw) || 0;

            return {
                sku: getVal('sku'),
                hsn: getVal('hsn') || '85469010',
                name: getVal('name') || 'Unnamed Item',
                category: getVal('category') || 'General',
                unit: getVal('unit') || 'Nos',
                price: price,
                taxRate: taxRate,
                defaultDiscount: defaultDiscount,
                description: getVal('description')
            };
        }).filter(item => item.name && item.name !== 'Unnamed Item');

        if (mappedItems.length === 0) {
            window.showToast('Could not extract valid product records. Check column headers.', 'error');
            return;
        }

        this.pendingImportData = mappedItems;
        this.showImportPreviewModal(fileName, mappedItems);
    }

    detectColumnMapping(keys) {
        const mapping = {
            sku: '',
            hsn: '',
            name: '',
            category: '',
            unit: '',
            price: '',
            taxRate: '',
            defaultDiscount: '',
            description: ''
        };

        const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        keys.forEach(key => {
            const norm = normalize(key);
            if (!mapping.hsn && /^(hsn|hsncode|hsnsac|sac|tariff|hsnno)$/.test(norm)) {
                mapping.hsn = key;
            } else if (!mapping.sku && /^(sku|code|itemcode|productcode|partnumber|model)$/.test(norm)) {
                mapping.sku = key;
            } else if (!mapping.name && /^(name|itemname|productname|product|item|description|title)$/.test(norm)) {
                mapping.name = key;
            } else if (!mapping.category && /^(category|group|type|department|dept)$/.test(norm)) {
                mapping.category = key;
            } else if (!mapping.unit && /^(unit|uom|unitofmeasure|measure|qtyunit)$/.test(norm)) {
                mapping.unit = key;
            } else if (!mapping.price && /^(price|unitprice|rate|cost|amount|unitrate)$/.test(norm)) {
                mapping.price = key;
            } else if (!mapping.defaultDiscount && /^(discount|disc|discountpct|discpercent|itemdiscount)$/.test(norm)) {
                mapping.defaultDiscount = key;
            } else if (!mapping.taxRate && /^(tax|taxrate|vat|gst|gstrate|taxpercent)$/.test(norm)) {
                mapping.taxRate = key;
            } else if (!mapping.description && /^(details|specification|notes|info|desc)$/.test(norm)) {
                mapping.description = key;
            }
        });

        if (!mapping.name && keys.length > 0) {
            mapping.name = keys.find(k => k !== mapping.sku && k !== mapping.hsn && k !== mapping.price) || keys[0];
        }

        return mapping;
    }

    showImportPreviewModal(fileName, items) {
        const modal = document.getElementById('importPreviewModal');
        const filenameSpan = document.getElementById('previewFileName');
        const totalRowsSpan = document.getElementById('previewTotalRows');
        const tbody = document.getElementById('importPreviewTableBody');

        if (filenameSpan) filenameSpan.textContent = fileName;
        if (totalRowsSpan) totalRowsSpan.textContent = `${items.length} items detected`;

        if (tbody) {
            tbody.innerHTML = items.slice(0, 5).map(item => `
                <tr>
                    <td><code>${this.escapeHtml(item.hsn || '—')}</code></td>
                    <td><strong>${this.escapeHtml(item.name)}</strong></td>
                    <td>${this.escapeHtml(item.unit || 'Nos')}</td>
                    <td class="text-right">₹${item.price.toFixed(2)}</td>
                    <td class="text-right">${item.defaultDiscount}%</td>
                    <td class="text-right">${item.taxRate}%</td>
                </tr>
            `).join('');
        }

        if (modal) modal.showModal();
    }

    confirmImport(mode = 'append') {
        if (!this.pendingImportData || this.pendingImportData.length === 0) return;

        if (mode === 'replace') {
            window.appStorage.clearCatalog();
        }

        let addedCount = 0;
        this.pendingImportData.forEach(item => {
            window.appStorage.addCatalogItem(item);
            addedCount++;
        });

        this.closeImportModal();
        this.loadCatalog();
        window.showToast(`Successfully imported ${addedCount} items into catalog!`, 'success');
        this.pendingImportData = null;
    }

    closeImportModal() {
        const modal = document.getElementById('importPreviewModal');
        if (modal) modal.close();
        this.pendingImportData = null;
    }

    // --- Export Catalog ---
    exportToExcel() {
        if (!window.XLSX) {
            window.showToast('SheetJS library is not ready.', 'error');
            return;
        }

        const dataToExport = this.items.map(item => ({
            'HSN Code': item.hsn || '85469010',
            'SKU': item.sku || '',
            'Item Description': item.name,
            'Category': item.category || 'General',
            'UOM': item.unit || 'Nos',
            'Rate (₹)': item.price,
            'Discount (%)': item.defaultDiscount || 0,
            'GST Rate (%)': item.taxRate || 18,
            'Additional Details': item.description || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Catalog');

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `catalog-hsn-${dateStr}.xlsx`);
        window.showToast('Catalog exported to Excel successfully!', 'success');
    }

    // --- Add / Edit Modals ---
    openAddModal() {
        const modal = document.getElementById('catalogItemModal');
        const form = document.getElementById('catalogItemForm');
        const modalTitle = document.getElementById('catalogModalTitle');
        if (!modal || !form) return;

        form.reset();
        document.getElementById('catalogItemId').value = '';
        if (modalTitle) modalTitle.textContent = 'Add Catalog Product / Service';

        const settings = window.appStorage.getSettings();
        document.getElementById('itemHsn').value = '85469010';
        document.getElementById('itemUnit').value = 'Nos';
        document.getElementById('itemPrice').value = '0.00';
        document.getElementById('itemDiscount').value = '0';
        document.getElementById('itemTaxRate').value = settings.defaultGstRate || 18;

        modal.showModal();
    }

    openEditModal(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        const modal = document.getElementById('catalogItemModal');
        const form = document.getElementById('catalogItemForm');
        const modalTitle = document.getElementById('catalogModalTitle');
        if (!modal || !form) return;

        document.getElementById('catalogItemId').value = item.id;
        document.getElementById('itemSku').value = item.sku || '';
        document.getElementById('itemHsn').value = item.hsn || '85469010';
        document.getElementById('itemName').value = item.name || '';
        document.getElementById('itemCategory').value = item.category || '';
        document.getElementById('itemUnit').value = item.unit || 'Nos';
        document.getElementById('itemPrice').value = item.price || 0;
        document.getElementById('itemDiscount').value = item.defaultDiscount || 0;
        document.getElementById('itemTaxRate').value = item.taxRate || 18;
        document.getElementById('itemDescription').value = item.description || '';

        if (modalTitle) modalTitle.textContent = 'Edit Catalog Product';
        modal.showModal();
    }

    saveItemFromForm() {
        const id = document.getElementById('catalogItemId').value;
        const sku = document.getElementById('itemSku').value.trim();
        const hsn = document.getElementById('itemHsn').value.trim() || '85469010';
        const name = document.getElementById('itemName').value.trim();
        const category = document.getElementById('itemCategory').value.trim() || 'General';
        const unit = document.getElementById('itemUnit').value.trim() || 'Nos';
        const price = parseFloat(document.getElementById('itemPrice').value) || 0;
        const defaultDiscount = parseFloat(document.getElementById('itemDiscount').value) || 0;
        const taxRate = parseFloat(document.getElementById('itemTaxRate').value) || 18;
        const description = document.getElementById('itemDescription').value.trim();

        if (!name) {
            window.showToast('Please enter an item description.', 'error');
            return;
        }

        if (id) {
            window.appStorage.updateCatalogItem(id, { sku, hsn, name, category, unit, price, defaultDiscount, taxRate, description });
            window.showToast('Item updated successfully!', 'success');
        } else {
            window.appStorage.addCatalogItem({ sku, hsn, name, category, unit, price, defaultDiscount, taxRate, description });
            window.showToast('Item added to catalog!', 'success');
        }

        const modal = document.getElementById('catalogItemModal');
        if (modal) modal.close();

        this.loadCatalog();
    }

    deleteItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            window.appStorage.deleteCatalogItem(id);
            this.loadCatalog();
            window.showToast('Item deleted.', 'info');
        }
    }

    addToActiveInvoice(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (window.invoiceBuilder) {
            window.invoiceBuilder.addItemFromCatalog(item);
            window.showToast(`Added "${item.name}" to invoice!`, 'success');
            window.switchTab('invoiceTab');
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Global catalog instance
window.catalogManager = new CatalogManager();
