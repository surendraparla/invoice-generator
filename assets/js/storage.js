/**
 * storage.js - Local Storage & Data Management for Invoice Generator
 * 100% offline, persistent local storage with zero cloud dependencies.
 */

const STORAGE_KEYS = {
    CATALOG: 'invoice_gen_catalog',
    INVOICES: 'invoice_gen_invoices',
    SETTINGS: 'invoice_gen_settings',
    CLIENTS: 'invoice_gen_clients'
};

const DEFAULT_SETTINGS = {
    businessName: 'Acme Solutions Inc.',
    tagline: 'Professional Services & Consulting',
    logo: '',
    address: '123 Business Avenue, Suite 400\nNew York, NY 10001\nUnited States',
    phone: '+1 (555) 123-4567',
    email: 'billing@acmesolutions.com',
    website: 'www.acmesolutions.com',
    taxId: 'US-987654321',
    paymentDetails: 'Bank: JPMorgan Chase\nAccount Name: Acme Solutions Inc.\nAccount #: 9876543210\nRouting / SWIFT: CHASEUS33',
    defaultTerms: 'Payment is due within 14 days of invoice date. Thank you for your business!',
    defaultNotes: 'All services rendered and products delivered per agreed specifications.',
    defaultTaxRate: 10,
    currencySymbol: '$',
    currencyCode: 'USD',
    nextInvoiceNumber: 1001,
    invoicePrefix: 'INV-'
};

const DEFAULT_CATALOG = [
    {
        id: 'item-1',
        sku: 'SRV-001',
        name: 'Web Application Development',
        category: 'Services',
        unit: 'hours',
        price: 85.00,
        taxRate: 10.0,
        description: 'Custom full-stack web application development and API integration'
    },
    {
        id: 'item-2',
        sku: 'SRV-002',
        name: 'UI/UX Design & Prototyping',
        category: 'Services',
        unit: 'hours',
        price: 75.00,
        taxRate: 10.0,
        description: 'Interactive wireframes, user testing, and high-fidelity Figma components'
    },
    {
        id: 'item-3',
        sku: 'SRV-003',
        name: 'Cloud Infrastructure Consulting',
        category: 'Consulting',
        unit: 'hours',
        price: 120.00,
        taxRate: 10.0,
        description: 'Cloud architecture, automated pipelines, security hardening'
    },
    {
        id: 'item-4',
        sku: 'HW-101',
        name: 'Dell UltraSharp 27" 4K Monitor',
        category: 'Hardware',
        unit: 'units',
        price: 450.00,
        taxRate: 8.5,
        description: 'IPS Black panel, 98% DCI-P3 color gamut, USB-C 90W power delivery'
    },
    {
        id: 'item-5',
        sku: 'HW-102',
        name: 'Logitech MX Master 3S Mouse',
        category: 'Hardware',
        unit: 'units',
        price: 99.00,
        taxRate: 8.5,
        description: 'Ergonomic performance wireless mouse with MagSpeed scrolling'
    },
    {
        id: 'item-6',
        sku: 'SFT-201',
        name: 'Annual Software License',
        category: 'Software',
        unit: 'licenses',
        price: 240.00,
        taxRate: 0.0,
        description: 'Per-user annual enterprise software seat license'
    },
    {
        id: 'item-7',
        sku: 'MNT-301',
        name: 'Monthly Maintenance & Support',
        category: 'Maintenance',
        unit: 'months',
        price: 350.00,
        taxRate: 10.0,
        description: 'Ongoing server updates, security patches, uptime monitoring, and priority support'
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
        settings.nextInvoiceNumber = (parseInt(settings.nextInvoiceNumber, 10) || 1000) + 1;
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
            name: (item.name || '').trim(),
            category: (item.category || 'General').trim(),
            unit: (item.unit || 'pcs').trim(),
            price: parseFloat(item.price) || 0,
            taxRate: parseFloat(item.taxRate) || 0,
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
                price: parseFloat(updatedFields.price) || 0,
                taxRate: parseFloat(updatedFields.taxRate) || 0
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

        // Also track client in clients list if has name
        if (invoice.client && invoice.client.name) {
            this.saveClient(invoice.client);
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
            version: '1.0',
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
