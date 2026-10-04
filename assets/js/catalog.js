/**
 * catalog.js - Catalog Management & Excel Importer/Exporter
 * Fully offline catalog management with smart column mapping and preview.
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
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-content">
                            <span class="empty-icon">📦</span>
                            <h4>No Catalog Items Found</h4>
                            <p>${this.items.length === 0 ? 'Your catalog is empty. Import an Excel spreadsheet or add items manually.' : 'No items match your current filter criteria.'}</p>
                            ${this.items.length === 0 ? '<button class="btn btn-primary btn-sm" onclick="window.catalogManager.openAddModal()">+ Add First Item</button>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const currency = window.appStorage.getSettings().currencySymbol || '$';

        tbody.innerHTML = this.filteredItems.map(item => `
            <tr data-id="${item.id}">
                <td><code class="sku-badge">${this.escapeHtml(item.sku || '—')}</code></td>
                <td>
                    <div class="item-name-cell">
                        <strong>${this.escapeHtml(item.name)}</strong>
                        ${item.description ? `<small class="text-muted">${this.escapeHtml(item.description)}</small>` : ''}
                    </div>
                </td>
                <td><span class="category-pill">${this.escapeHtml(item.category || 'General')}</span></td>
                <td><span class="unit-text">${this.escapeHtml(item.unit || 'pcs')}</span></td>
                <td class="text-right"><strong>${currency}${parseFloat(item.price || 0).toFixed(2)}</strong></td>
                <td class="text-right">${parseFloat(item.taxRate || 0)}%</td>
                <td class="text-center actions-cell">
                    <button class="btn-icon" title="Add directly to active invoice" onclick="window.catalogManager.addToActiveInvoice('${item.id}')">
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

        // Excel file import listener
        const excelInput = document.getElementById('catalogExcelFileInput');
        if (excelInput) {
            excelInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleExcelFile(file);
                }
                e.target.value = ''; // Reset so same file can be selected again
            });
        }

        // Drag & drop on import box
        const dropZone = document.getElementById('excelDropZone');
        if (dropZone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.remove('drag-over');
                }, false);
            });

            dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const file = dt.files[0];
                if (file) {
                    this.handleExcelFile(file);
                }
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

        // Smart column mapping logic
        const mapping = this.detectColumnMapping(keys);

        const mappedItems = rawRows.map(row => {
            const getVal = (field) => mapping[field] ? String(row[mapping[field]] ?? '').trim() : '';

            // Clean price
            let priceRaw = getVal('price');
            priceRaw = priceRaw.replace(/[^0-9.-]/g, '');
            const price = parseFloat(priceRaw) || 0;

            // Clean tax
            let taxRaw = getVal('taxRate');
            taxRaw = taxRaw.replace(/[^0-9.-]/g, '');
            const taxRate = parseFloat(taxRaw) || 0;

            return {
                sku: getVal('sku'),
                name: getVal('name') || 'Unnamed Item',
                category: getVal('category') || 'General',
                unit: getVal('unit') || 'pcs',
                price: price,
                taxRate: taxRate,
                description: getVal('description')
            };
        }).filter(item => item.name && item.name !== 'Unnamed Item');

        if (mappedItems.length === 0) {
            window.showToast('Could not extract valid product records. Check column headers.', 'error');
            return;
        }

        this.pendingImportData = mappedItems;
        this.showImportPreviewModal(fileName, mappedItems, mapping);
    }

    detectColumnMapping(keys) {
        const mapping = {
            sku: '',
            name: '',
            category: '',
            unit: '',
            price: '',
            taxRate: '',
            description: ''
        };

        const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        keys.forEach(key => {
            const norm = normalize(key);
            if (!mapping.sku && /^(sku|code|itemcode|productcode|id|partnumber|model)$/.test(norm)) {
                mapping.sku = key;
            } else if (!mapping.name && /^(name|itemname|productname|product|item|title|label)$/.test(norm)) {
                mapping.name = key;
            } else if (!mapping.category && /^(category|cat|group|type|department|dept|class)$/.test(norm)) {
                mapping.category = key;
            } else if (!mapping.unit && /^(unit|uom|unitofmeasure|measure|qtyunit)$/.test(norm)) {
                mapping.unit = key;
            } else if (!mapping.price && /^(price|unitprice|rate|cost|retailprice|unitrate|amount)$/.test(norm)) {
                mapping.price = key;
            } else if (!mapping.taxRate && /^(tax|taxrate|vat|gst|taxpercent|taxpct)$/.test(norm)) {
                mapping.taxRate = key;
            } else if (!mapping.description && /^(description|desc|details|specification|notes|info)$/.test(norm)) {
                mapping.description = key;
            }
        });

        // Fallbacks
        if (!mapping.name && keys.length > 0) {
            // First column with text
            mapping.name = keys.find(k => k !== mapping.sku && k !== mapping.price) || keys[0];
        }

        return mapping;
    }

    showImportPreviewModal(fileName, items, mapping) {
        const modal = document.getElementById('importPreviewModal');
        const filenameSpan = document.getElementById('previewFileName');
        const totalRowsSpan = document.getElementById('previewTotalRows');
        const tbody = document.getElementById('importPreviewTableBody');

        if (filenameSpan) filenameSpan.textContent = fileName;
        if (totalRowsSpan) totalRowsSpan.textContent = `${items.length} products found`;

        if (tbody) {
            tbody.innerHTML = items.slice(0, 5).map(item => `
                <tr>
                    <td><code>${this.escapeHtml(item.sku || '—')}</code></td>
                    <td><strong>${this.escapeHtml(item.name)}</strong></td>
                    <td><span class="category-pill">${this.escapeHtml(item.category)}</span></td>
                    <td>${this.escapeHtml(item.unit)}</td>
                    <td class="text-right">$${item.price.toFixed(2)}</td>
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
        window.showToast(`Successfully imported ${addedCount} items into your catalog!`, 'success');
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
            'SKU': item.sku,
            'Item Name': item.name,
            'Category': item.category,
            'Unit': item.unit,
            'Unit Price': item.price,
            'Tax Rate (%)': item.taxRate,
            'Description': item.description
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Catalog');

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `product-catalog-${dateStr}.xlsx`);
        window.showToast('Catalog exported to Excel successfully!', 'success');
    }

    exportToCsv() {
        if (!window.XLSX) return;
        const dataToExport = this.items.map(item => ({
            'SKU': item.sku,
            'Item Name': item.name,
            'Category': item.category,
            'Unit': item.unit,
            'Unit Price': item.price,
            'Tax Rate (%)': item.taxRate,
            'Description': item.description
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `product-catalog-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.showToast('Catalog exported to CSV successfully!', 'success');
    }

    // --- Add / Edit Modals ---
    openAddModal() {
        const modal = document.getElementById('catalogItemModal');
        const form = document.getElementById('catalogItemForm');
        const modalTitle = document.getElementById('catalogModalTitle');
        if (!modal || !form) return;

        form.reset();
        document.getElementById('catalogItemId').value = '';
        if (modalTitle) modalTitle.textContent = 'Add New Catalog Item';

        // Prepopulate default tax rate from settings
        const settings = window.appStorage.getSettings();
        document.getElementById('itemTaxRate').value = settings.defaultTaxRate || 0;
        document.getElementById('itemUnit').value = 'pcs';

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
        document.getElementById('itemName').value = item.name || '';
        document.getElementById('itemCategory').value = item.category || '';
        document.getElementById('itemUnit').value = item.unit || 'pcs';
        document.getElementById('itemPrice').value = item.price || 0;
        document.getElementById('itemTaxRate').value = item.taxRate || 0;
        document.getElementById('itemDescription').value = item.description || '';

        if (modalTitle) modalTitle.textContent = 'Edit Catalog Item';
        modal.showModal();
    }

    saveItemFromForm() {
        const id = document.getElementById('catalogItemId').value;
        const sku = document.getElementById('itemSku').value.trim();
        const name = document.getElementById('itemName').value.trim();
        const category = document.getElementById('itemCategory').value.trim() || 'General';
        const unit = document.getElementById('itemUnit').value.trim() || 'pcs';
        const price = parseFloat(document.getElementById('itemPrice').value) || 0;
        const taxRate = parseFloat(document.getElementById('itemTaxRate').value) || 0;
        const description = document.getElementById('itemDescription').value.trim();

        if (!name) {
            window.showToast('Please enter an item name.', 'error');
            return;
        }

        if (id) {
            window.appStorage.updateCatalogItem(id, { sku, name, category, unit, price, taxRate, description });
            window.showToast('Item updated successfully!', 'success');
        } else {
            window.appStorage.addCatalogItem({ sku, name, category, unit, price, taxRate, description });
            window.showToast('Item added to catalog!', 'success');
        }

        const modal = document.getElementById('catalogItemModal');
        if (modal) modal.close();

        this.loadCatalog();
    }

    deleteItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (confirm(`Are you sure you want to delete "${item.name}" from your catalog?`)) {
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
            window.showToast(`Added "${item.name}" to active invoice!`, 'success');
            // Switch to invoice tab
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
