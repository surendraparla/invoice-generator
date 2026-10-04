/**
 * storage.js - Local Storage & Data Management for Invoice Generator
 * 100% offline, persistent local storage with zero cloud dependencies.
 * Tailored for GST / Proforma & Tax Invoicing.
 */

const STORAGE_KEYS = {
    CATALOG: 'invoice_gen_catalog_v2',
    INVOICES: 'invoice_gen_invoices_v2',
    SETTINGS: 'invoice_gen_settings_v2',
    CLIENTS: 'invoice_gen_clients_v2'
};

const DEFAULT_SETTINGS = {
    businessName: 'Vikram Power Technologies Pvt. Ltd.',
    brandSubtitle: 'INNOVATION FOR NATION',
    brandLogoText: 'VIKCHEM',
    logo: '', // Base64 image if uploaded
    address: '39 Industrial Estate, Phase-II, Yamuna Nagar – 135001, Haryana, India',
    gstin: '06AADCV2496H1Z4',
    arn: 'AA060617009499V',
    email: 'sales@vptpl.com',
    phone: '+91-99966-30201',
    website: 'www.vptpl.com',
    bankName: 'HDFC Bank',
    accountName: 'Vikram Power Technologies Pvt. Ltd.',
    accountNo: '50200001507800',
    ifsc: 'HDFC0002563',
    branchPlace: 'Yamuna Nagar, Haryana',
    upiId: 'sales@vptpl',
    defaultGstRate: 18,
    currencySymbol: '₹',
    currencyCode: 'INR',
    defaultDocTitle: 'Proforma Invoice',
    nextInvoiceNumber: 210,
    invoicePrefix: 'No. ',
    defaultTerms: 'As per PI',
    companySealText: 'Vikram Power Technologies Pvt. Ltd.'
};

const DEFAULT_CATALOG = [
    {
        id: 'item-1',
        sku: '11KV-IND-35',
        hsn: '85469010',
        name: '11kv- 3C X 35 INDOOR',
        category: 'Cable Terminations',
        unit: 'Nos',
        price: 760.00,
        taxRate: 18.0,
        defaultDiscount: 0,
        description: '11KV Heat Shrinkable Indoor Cable Jointing Kit'
    },
    {
        id: 'item-2',
        sku: '11KV-OUT-35',
        hsn: '85469010',
        name: '11kv- 3C X 35 OUTDOOR',
        category: 'Cable Terminations',
        unit: 'Nos',
        price: 860.00,
        taxRate: 18.0,
        defaultDiscount: 0,
        description: '11KV Heat Shrinkable Outdoor Cable Jointing Kit'
    },
    {
        id: 'item-3',
        sku: '11KV-POST-INS',
        hsn: '85469010',
        name: '11KV POST INSULATOR',
        category: 'Insulators',
        unit: 'Nos',
        price: 130.00,
        taxRate: 18.0,
        defaultDiscount: 0,
        description: 'High creepage solid core post insulator'
    },
    {
        id: 'item-4',
        sku: 'LT-PIN-INS',
        hsn: '85469010',
        name: 'LT 1.1 KV PIN INSULATOR',
        category: 'Insulators',
        unit: 'Nos',
        price: 80.00,
        taxRate: 18.0,
        defaultDiscount: 0,
        description: 'Porcelain pin insulator for distribution networks'
    },
    {
        id: 'item-5',
        sku: '11KV-VCB-630',
        hsn: '85352100',
        name: '11KV Vacuum Circuit Breaker (VCB) 630A',
        category: 'Switchgear',
        unit: 'Sets',
        price: 45000.00,
        taxRate: 18.0,
        defaultDiscount: 5,
        description: 'Indoor drawout type vacuum circuit breaker panel with relays'
    },
    {
        id: 'item-6',
        sku: '11KV-CBL-185',
        hsn: '85446090',
        name: '11KV XLPE Armoured HT Cable (3C x 185)',
        category: 'Cables',
        unit: 'Mtr',
        price: 1450.00,
        taxRate: 18.0,
        defaultDiscount: 2,
        description: 'Heavy duty aluminium conductor screened armoured cable'
    }
];

class StorageManager {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CATALOG)) {
            localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(DEFAULT_CATALOG));
        }
        if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
            localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
            localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
        }
    }

    // --- Settings ---
    getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
        } catch (e) {
            console.error('Error loading settings', e);
            return DEFAULT_SETTINGS;
        }
    }

    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    incrementInvoiceNumber() {
        const settings = this.getSettings();
        const current = parseInt(settings.nextInvoiceNumber, 10) || 210;
        settings.nextInvoiceNumber = current + 1;
        this.saveSettings(settings);
        return settings.nextInvoiceNumber;
    }

    // --- Catalog ---
    getCatalog() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CATALOG);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading catalog', e);
            return [];
        }
    }

    saveCatalog(catalog) {
        localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
    }

    addCatalogItem(item) {
        const catalog = this.getCatalog();
        const newItem = {
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            sku: (item.sku || '').trim(),
            hsn: (item.hsn || item.hsnCode || '85469010').trim(),
            name: (item.name || '').trim(),
            category: (item.category || 'General').trim(),
            unit: (item.unit || item.uom || 'Nos').trim(),
            price: parseFloat(item.price || item.rate) || 0,
            taxRate: parseFloat(item.taxRate) || 18,
            defaultDiscount: parseFloat(item.defaultDiscount || item.discount) || 0,
            description: (item.description || '').trim()
        };
        catalog.push(newItem);
        this.saveCatalog(catalog);
        return newItem;
    }

    updateCatalogItem(id, updatedFields) {
        const catalog = this.getCatalog();
        const index = catalog.findIndex(item => item.id === id);
        if (index !== -1) {
            catalog[index] = {
                ...catalog[index],
                ...updatedFields,
                price: parseFloat(updatedFields.price || updatedFields.rate) || 0,
                taxRate: parseFloat(updatedFields.taxRate) || 18,
                defaultDiscount: parseFloat(updatedFields.defaultDiscount || updatedFields.discount) || 0
            };
            this.saveCatalog(catalog);
            return catalog[index];
        }
        return null;
    }

    deleteCatalogItem(id) {
        let catalog = this.getCatalog();
        catalog = catalog.filter(item => item.id !== id);
        this.saveCatalog(catalog);
        return true;
    }

    clearCatalog() {
        this.saveCatalog([]);
    }

    // --- Invoices ---
    getInvoices() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading invoices', e);
            return [];
        }
    }

    saveInvoices(invoices) {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    }

    saveInvoice(invoice) {
        const invoices = this.getInvoices();
        const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
        const timestamp = new Date().toISOString();

        if (existingIndex !== -1) {
            invoices[existingIndex] = {
                ...invoice,
                updatedAt: timestamp
            };
        } else {
            invoice.id = invoice.id || 'inv-' + Date.now();
            invoice.createdAt = timestamp;
            invoice.updatedAt = timestamp;
            invoices.unshift(invoice);
        }

        this.saveInvoices(invoices);

        if (invoice.billTo && invoice.billTo.name) {
            this.saveClient(invoice.billTo);
        }

        return invoice;
    }

    getInvoiceById(id) {
        const invoices = this.getInvoices();
        return invoices.find(inv => inv.id === id);
    }

    deleteInvoice(id) {
        let invoices = this.getInvoices();
        invoices = invoices.filter(inv => inv.id !== id);
        this.saveInvoices(invoices);
        return true;
    }

    updateInvoiceStatus(id, newStatus) {
        const invoices = this.getInvoices();
        const inv = invoices.find(i => i.id === id);
        if (inv) {
            inv.status = newStatus;
            inv.updatedAt = new Date().toISOString();
            this.saveInvoices(invoices);
            return true;
        }
        return false;
    }

    // --- Clients ---
    getClients() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveClient(client) {
        if (!client || !client.name) return;
        const clients = this.getClients();
        const existingIdx = clients.findIndex(c => c.name.toLowerCase() === client.name.toLowerCase());
        if (existingIdx !== -1) {
            clients[existingIdx] = { ...clients[existingIdx], ...client };
        } else {
            clients.push({ ...client, id: 'client-' + Date.now() });
        }
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    }

    // --- Backup & Restore ---
    exportAllData() {
        return {
            version: '2.0',
            exportDate: new Date().toISOString(),
            settings: this.getSettings(),
            catalog: this.getCatalog(),
            invoices: this.getInvoices(),
            clients: this.getClients()
        };
    }

    importAllData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid backup file format');
        }
        if (data.settings) this.saveSettings(data.settings);
        if (Array.isArray(data.catalog)) this.saveCatalog(data.catalog);
        if (Array.isArray(data.invoices)) this.saveInvoices(data.invoices);
        if (Array.isArray(data.clients)) localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data.clients));
        return true;
    }
}

// Global storage singleton instance
window.appStorage = new StorageManager();
