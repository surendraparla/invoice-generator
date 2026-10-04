/**
 * app.js - Main Application Orchestrator & UI Controller
 * Manages tabs, invoice history, company settings, and quick modals.
 */

// Global toast alert helper
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

// Global tab switcher
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'catalogTab' && window.catalogManager) {
        window.catalogManager.loadCatalog();
    } else if (tabId === 'historyTab' && window.invoiceHistoryManager) {
        window.invoiceHistoryManager.loadInvoices();
    } else if (tabId === 'settingsTab' && window.settingsManager) {
        window.settingsManager.loadSettingsToForm();
    }
};

// --- Invoice History Manager ---
class InvoiceHistoryManager {
    constructor() {
        this.invoices = [];
        this.filterStatus = 'all';
        this.searchQuery = '';
    }

    init() {
        this.loadInvoices();
        this.setupEventListeners();
    }

    loadInvoices() {
        this.invoices = window.appStorage.getInvoices();
        this.render();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('historySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.render();
            });
        }

        const filterSelect = document.getElementById('historyStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterStatus = e.target.value;
                this.render();
            });
        }
    }

    render() {
        const tbody = document.getElementById('historyTableBody');
        const badge = document.getElementById('historyCountBadge');
        if (!tbody) return;

        const filtered = this.invoices.filter(inv => {
            const matchesStatus = this.filterStatus === 'all' || inv.status === this.filterStatus;
            const clientName = (inv.billTo && inv.billTo.name) ? inv.billTo.name.toLowerCase() : '';
            const invNum = (inv.invoiceNumber || '').toLowerCase();
            const matchesSearch = !this.searchQuery || clientName.includes(this.searchQuery) || invNum.includes(this.searchQuery);
            return matchesStatus && matchesSearch;
        });

        if (badge) {
            badge.textContent = `${filtered.length} Invoices`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-content">
                            <span class="empty-icon">📑</span>
                            <h4>No Saved Invoices</h4>
                            <p>${this.invoices.length === 0 ? 'You have not saved any invoices yet. Create and save your first invoice!' : 'No invoices match your filter.'}</p>
                            ${this.invoices.length === 0 ? '<button class="btn btn-primary btn-sm" onclick="window.switchTab(\'invoiceTab\')">+ Create Invoice</button>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(inv => `
            <tr>
                <td><strong style="color: #c5221f;">No. ${this.escapeHtml(inv.invoiceNumber)}</strong></td>
                <td>
                    <strong>${this.escapeHtml(inv.billTo?.name || 'Unnamed Client')}</strong>
                </td>
                <td>${inv.date}</td>
                <td>${inv.terms || '—'}</td>
                <td class="text-right font-bold font-mono">₹ ${(parseFloat(inv.totalPayable) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-center">
                    <select class="status-select" onchange="window.invoiceHistoryManager.changeStatus('${inv.id}', this.value)">
                        <option value="Draft" ${inv.status === 'Draft' ? 'selected' : ''}>Draft</option>
                        <option value="Sent" ${inv.status === 'Sent' ? 'selected' : ''}>Sent</option>
                        <option value="Paid" ${inv.status === 'Paid' ? 'selected' : ''}>Paid</option>
                        <option value="Overdue" ${inv.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
                    </select>
                </td>
                <td class="text-center actions-cell">
                    <button class="btn-icon" title="Edit / Load into Editor" onclick="window.invoiceHistoryManager.loadInvoice('${inv.id}')">
                        ✏️
                    </button>
                    <button class="btn-icon" title="Print / PDF" onclick="window.invoiceHistoryManager.printDirect('${inv.id}')">
                        🖨️
                    </button>
                    <button class="btn-icon btn-danger-icon" title="Delete Invoice" onclick="window.invoiceHistoryManager.deleteInvoice('${inv.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }

    changeStatus(id, newStatus) {
        window.appStorage.updateInvoiceStatus(id, newStatus);
        this.loadInvoices();
        window.showToast(`Invoice marked as ${newStatus}`, 'success');
    }

    loadInvoice(id) {
        const inv = window.appStorage.getInvoiceById(id);
        if (inv && window.invoiceBuilder) {
            window.invoiceBuilder.loadSavedInvoice(inv);
        }
    }

    printDirect(id) {
        const inv = window.appStorage.getInvoiceById(id);
        if (inv && window.invoiceBuilder) {
            window.invoiceBuilder.loadSavedInvoice(inv);
            setTimeout(() => {
                window.invoiceBuilder.printInvoice();
            }, 300);
        }
    }

    deleteInvoice(id) {
        if (confirm('Are you sure you want to delete this invoice record?')) {
            window.appStorage.deleteInvoice(id);
            this.loadInvoices();
            window.showToast('Invoice deleted', 'info');
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

// --- Settings Manager ---
class SettingsManager {
    constructor() {}

    init() {
        this.loadSettingsToForm();
        this.setupEventListeners();
    }

    loadSettingsToForm() {
        const s = window.appStorage.getSettings();
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== undefined ? val : '';
        };

        set('settingBusinessName', s.businessName);
        set('settingBrandLogoText', s.brandLogoText);
        set('settingBrandSubtitle', s.brandSubtitle);
        set('settingAddress', s.address);
        set('settingGstin', s.gstin);
        set('settingArn', s.arn);
        set('settingEmail', s.email);
        set('settingPhone', s.phone);

        set('settingBankName', s.bankName);
        set('settingAccountName', s.accountName);
        set('settingAccountNo', s.accountNo);
        set('settingIfsc', s.ifsc);
        set('settingBranchPlace', s.branchPlace);
        set('settingUpiId', s.upiId);
        set('settingCompanySealText', s.companySealText);

        const logoPreview = document.getElementById('settingLogoPreview');
        if (logoPreview) {
            logoPreview.src = s.logo || '';
            logoPreview.style.display = s.logo ? 'block' : 'none';
        }
    }

    setupEventListeners() {
        const logoInput = document.getElementById('settingLogoInput');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const settings = window.appStorage.getSettings();
                        settings.logo = evt.target.result;
                        window.appStorage.saveSettings(settings);

                        const preview = document.getElementById('settingLogoPreview');
                        if (preview) {
                            preview.src = settings.logo;
                            preview.style.display = 'block';
                        }
                        window.showToast('Company logo updated!', 'success');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    saveSettings() {
        const get = id => (document.getElementById(id)?.value || '').trim();
        const current = window.appStorage.getSettings();

        const updated = {
            ...current,
            businessName: get('settingBusinessName'),
            brandLogoText: get('settingBrandLogoText'),
            brandSubtitle: get('settingBrandSubtitle'),
            address: get('settingAddress'),
            gstin: get('settingGstin'),
            arn: get('settingArn'),
            email: get('settingEmail'),
            phone: get('settingPhone'),
            bankName: get('settingBankName'),
            accountName: get('settingAccountName'),
            accountNo: get('settingAccountNo'),
            ifsc: get('settingIfsc'),
            branchPlace: get('settingBranchPlace'),
            upiId: get('settingUpiId'),
            companySealText: get('settingCompanySealText')
        };

        window.appStorage.saveSettings(updated);
        window.showToast('Company profile & bank settings saved!', 'success');

        if (window.invoiceBuilder) {
            window.invoiceBuilder.calculateAndRender();
        }
    }

    exportFullBackup() {
        const data = window.appStorage.exportAllData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-data-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.showToast('Data backup downloaded successfully!', 'success');
    }

    importFullBackup(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                window.appStorage.importAllData(parsed);
                this.loadSettingsToForm();
                if (window.catalogManager) window.catalogManager.loadCatalog();
                if (window.invoiceHistoryManager) window.invoiceHistoryManager.loadInvoices();
                if (window.invoiceBuilder) window.invoiceBuilder.calculateAndRender();
                window.showToast('Backup restored successfully!', 'success');
            } catch (err) {
                window.showToast('Failed to restore backup: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }
}

// --- Quick Catalog Picker Modal (Inside Invoice Tab) ---
window.openCatalogPickerModal = function() {
    const modal = document.getElementById('catalogPickerModal');
    const tbody = document.getElementById('catalogPickerTableBody');
    const searchInput = document.getElementById('catalogPickerSearch');
    if (!modal || !tbody) return;

    const catalog = window.appStorage.getCatalog();

    const renderList = (items) => {
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">No catalog products found.</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td><code class="font-mono">${item.hsn || '85469010'}</code></td>
                <td>
                    <strong>${item.name}</strong>
                    ${item.description ? `<br><small class="text-muted">${item.description}</small>` : ''}
                </td>
                <td>${item.unit || 'Nos'}</td>
                <td class="text-right font-mono font-bold">₹ ${(parseFloat(item.price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">${item.defaultDiscount || 0}%</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary" onclick="window.selectCatalogItemForInvoice('${item.id}')">
                        + Add
                    </button>
                </td>
            </tr>
        `).join('');
    };

    renderList(catalog);

    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => {
            const q = e.target.value.toLowerCase().trim();
            const filtered = catalog.filter(it =>
                (it.name && it.name.toLowerCase().includes(q)) ||
                (it.hsn && it.hsn.toLowerCase().includes(q)) ||
                (it.sku && it.sku.toLowerCase().includes(q)) ||
                (it.category && it.category.toLowerCase().includes(q))
            );
            renderList(filtered);
        };
    }

    modal.showModal();
};

window.selectCatalogItemForInvoice = function(itemId) {
    const catalog = window.appStorage.getCatalog();
    const item = catalog.find(i => i.id === itemId);
    if (item && window.invoiceBuilder) {
        window.invoiceBuilder.addItemFromCatalog(item);
        window.showToast(`Added "${item.name}" with HSN ${item.hsn || ''}!`, 'success');
    }
    const modal = document.getElementById('catalogPickerModal');
    if (modal) modal.close();
};

// Document ready bootstrap
document.addEventListener('DOMContentLoaded', () => {
    window.invoiceHistoryManager = new InvoiceHistoryManager();
    window.settingsManager = new SettingsManager();

    if (window.catalogManager) window.catalogManager.init();
    if (window.invoiceBuilder) window.invoiceBuilder.init();
    if (window.invoiceHistoryManager) window.invoiceHistoryManager.init();
    if (window.settingsManager) window.settingsManager.init();

    // Wire navigation tab clicks
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.switchTab(btn.dataset.target);
        });
    });

    // Wire backup restore input
    const restoreInput = document.getElementById('backupRestoreFileInput');
    if (restoreInput) {
        restoreInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                window.settingsManager.importFullBackup(e.target.files[0]);
            }
            e.target.value = '';
        });
    }
});
