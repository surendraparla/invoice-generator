/**
 * invoice.js - Invoice Builder, Real-time Calculator & PDF Exporter
 * Offline invoice generator with instant live preview and printing.
 */

class InvoiceBuilder {
    constructor() {
        this.currentInvoiceId = null;
        this.items = [];
        this.client = {
            name: '',
            company: '',
            address: '',
            email: '',
            phone: '',
            taxId: ''
        };
        this.invoiceNumber = '';
        this.date = '';
        this.dueDate = '';
        this.poNumber = '';
        this.discountType = 'percent'; // 'percent' or 'flat'
        this.discountValue = 0;
        this.shippingFee = 0;
        this.paidAmount = 0;
        this.notes = '';
        this.terms = '';
        this.status = 'Draft';
        this.accentColor = '#2563eb'; // Default modern blue
    }

    init() {
        this.resetToNewInvoice();
        this.setupEventListeners();
    }

    resetToNewInvoice() {
        const settings = window.appStorage.getSettings();
        const nextNum = settings.nextInvoiceNumber || 1001;
        const prefix = settings.invoicePrefix || 'INV-';

        this.currentInvoiceId = 'inv-' + Date.now();
        this.invoiceNumber = `${prefix}${nextNum}`;
        this.status = 'Draft';

        const today = new Date();
        const due = new Date();
        due.setDate(today.getDate() + 14); // Default 14 days

        this.date = today.toISOString().split('T')[0];
        this.dueDate = due.toISOString().split('T')[0];
        this.poNumber = '';

        this.client = {
            name: '',
            company: '',
            address: '',
            email: '',
            phone: '',
            taxId: ''
        };

        this.discountType = 'percent';
        this.discountValue = 0;
        this.shippingFee = 0;
        this.paidAmount = 0;
        this.notes = settings.defaultNotes || '';
        this.terms = settings.defaultTerms || '';
        this.accentColor = '#2563eb';

        // Start with one sample item from catalog if available, or blank item
        const catalog = window.appStorage.getCatalog();
        if (catalog.length > 0) {
            this.items = [{
                id: 'line-' + Date.now(),
                catalogId: catalog[0].id,
                name: catalog[0].name,
                description: catalog[0].description || '',
                unit: catalog[0].unit || 'pcs',
                quantity: 1,
                unitPrice: catalog[0].price || 0,
                discount: 0,
                taxRate: catalog[0].taxRate || 0
            }];
        } else {
            this.items = [{
                id: 'line-' + Date.now(),
                catalogId: '',
                name: 'Consulting Services',
                description: 'Initial project setup & consultation',
                unit: 'hours',
                quantity: 1,
                unitPrice: 100.00,
                discount: 0,
                taxRate: settings.defaultTaxRate || 0
            }];
        }

        this.syncStateToForm();
        this.calculateAndRender();
    }

    syncStateToForm() {
        // Populate inputs from this.state
        this.setVal('invNumberInput', this.invoiceNumber);
        this.setVal('invDateInput', this.date);
        this.setVal('invDueDateInput', this.dueDate);
        this.setVal('invPoNumberInput', this.poNumber);

        this.setVal('clientNameInput', this.client.name);
        this.setVal('clientCompanyInput', this.client.company);
        this.setVal('clientAddressInput', this.client.address);
        this.setVal('clientEmailInput', this.client.email);
        this.setVal('clientPhoneInput', this.client.phone);
        this.setVal('clientTaxIdInput', this.client.taxId);

        this.setVal('invDiscountValueInput', this.discountValue);
        this.setVal('invDiscountTypeInput', this.discountType);
        this.setVal('invShippingFeeInput', this.shippingFee);
        this.setVal('invPaidAmountInput', this.paidAmount);

        this.setVal('invNotesInput', this.notes);
        this.setVal('invTermsInput', this.terms);
        this.setVal('invStatusSelect', this.status);
    }

    setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined ? val : '';
    }

    setupEventListeners() {
        // Form field changes update state & recalculate
        const bindInput = (id, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    callback(e.target.value);
                    this.calculateAndRender();
                });
            }
        };

        bindInput('invNumberInput', v => this.invoiceNumber = v);
        bindInput('invDateInput', v => this.date = v);
        bindInput('invDueDateInput', v => this.dueDate = v);
        bindInput('invPoNumberInput', v => this.poNumber = v);

        bindInput('clientNameInput', v => this.client.name = v);
        bindInput('clientCompanyInput', v => this.client.company = v);
        bindInput('clientAddressInput', v => this.client.address = v);
        bindInput('clientEmailInput', v => this.client.email = v);
        bindInput('clientPhoneInput', v => this.client.phone = v);
        bindInput('clientTaxIdInput', v => this.client.taxId = v);

        bindInput('invDiscountValueInput', v => this.discountValue = parseFloat(v) || 0);
        bindInput('invShippingFeeInput', v => this.shippingFee = parseFloat(v) || 0);
        bindInput('invPaidAmountInput', v => this.paidAmount = parseFloat(v) || 0);

        const discountTypeEl = document.getElementById('invDiscountTypeInput');
        if (discountTypeEl) {
            discountTypeEl.addEventListener('change', (e) => {
                this.discountType = e.target.value;
                this.calculateAndRender();
            });
        }

        bindInput('invNotesInput', v => this.notes = v);
        bindInput('invTermsInput', v => this.terms = v);

        const statusSelect = document.getElementById('invStatusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.status = e.target.value;
                this.calculateAndRender();
            });
        }

        // Color theme picker
        const colorPicker = document.getElementById('invAccentColorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.accentColor = e.target.value;
                this.calculateAndRender();
            });
        }
    }

    // --- Line Items Management ---
    addItemFromCatalog(catalogItem) {
        this.items.push({
            id: 'line-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            catalogId: catalogItem.id,
            name: catalogItem.name,
            description: catalogItem.description || '',
            unit: catalogItem.unit || 'pcs',
            quantity: 1,
            unitPrice: catalogItem.price || 0,
            discount: 0,
            taxRate: catalogItem.taxRate || 0
        });
        this.calculateAndRender();
    }

    addCustomItem() {
        const settings = window.appStorage.getSettings();
        this.items.push({
            id: 'line-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            catalogId: '',
            name: 'New Item',
            description: '',
            unit: 'pcs',
            quantity: 1,
            unitPrice: 0.00,
            discount: 0,
            taxRate: settings.defaultTaxRate || 0
        });
        this.calculateAndRender();
    }

    removeLineItem(id) {
        if (this.items.length <= 1) {
            window.showToast('An invoice must have at least one line item.', 'info');
            return;
        }
        this.items = this.items.filter(item => item.id !== id);
        this.calculateAndRender();
    }

    updateLineItem(id, field, value) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (['quantity', 'unitPrice', 'discount', 'taxRate'].includes(field)) {
            item[field] = parseFloat(value) || 0;
        } else {
            item[field] = value;
        }

        this.calculateAndRender();
    }

    // --- Calculations & Rendering ---
    calculateTotals() {
        const currency = window.appStorage.getSettings().currencySymbol || '$';

        let subtotal = 0;
        let totalTax = 0;
        let lineCalculations = [];

        this.items.forEach(item => {
            const rawAmount = (item.quantity || 0) * (item.unitPrice || 0);
            const lineDiscount = rawAmount * ((item.discount || 0) / 100);
            const discountedAmount = Math.max(0, rawAmount - lineDiscount);
            const taxAmount = discountedAmount * ((item.taxRate || 0) / 100);

            subtotal += discountedAmount;
            totalTax += taxAmount;

            lineCalculations.push({
                ...item,
                discountedAmount,
                taxAmount,
                total: discountedAmount + taxAmount
            });
        });

        // Global discount
        let overallDiscountAmount = 0;
        if (this.discountType === 'percent') {
            overallDiscountAmount = subtotal * (this.discountValue / 100);
        } else {
            overallDiscountAmount = this.discountValue;
        }
        overallDiscountAmount = Math.min(subtotal, Math.max(0, overallDiscountAmount));

        const discountedSubtotal = subtotal - overallDiscountAmount;
        const shipping = Math.max(0, this.shippingFee || 0);
        const grandTotal = Math.max(0, discountedSubtotal + totalTax + shipping);
        const paid = Math.max(0, this.paidAmount || 0);
        const balanceDue = Math.max(0, grandTotal - paid);

        return {
            currency,
            subtotal,
            overallDiscountAmount,
            discountedSubtotal,
            totalTax,
            shipping,
            grandTotal,
            paid,
            balanceDue,
            lineCalculations
        };
    }

    calculateAndRender() {
        const totals = this.calculateTotals();
        this.renderLineItemsEditor(totals);
        this.renderTotalsSummary(totals);
        this.renderInvoicePreview(totals);
    }

    renderLineItemsEditor(totals) {
        const container = document.getElementById('invoiceLineItemsBody');
        if (!container) return;

        container.innerHTML = this.items.map((item, idx) => `
            <tr class="line-item-row" data-id="${item.id}">
                <td class="item-desc-col">
                    <input type="text" class="form-control form-control-sm font-semibold mb-1"
                           placeholder="Item Name" value="${this.escapeHtml(item.name)}"
                           oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'name', this.value)">
                    <input type="text" class="form-control form-control-xs text-muted"
                           placeholder="Description (optional)" value="${this.escapeHtml(item.description)}"
                           oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'description', this.value)">
                </td>
                <td style="width: 80px;">
                    <input type="number" step="any" min="0" class="form-control form-control-sm text-center"
                           value="${item.quantity}"
                           oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'quantity', this.value)">
                </td>
                <td style="width: 70px;">
                    <input type="text" class="form-control form-control-sm text-center"
                           placeholder="unit" value="${this.escapeHtml(item.unit || '')}"
                           oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'unit', this.value)">
                </td>
                <td style="width: 100px;">
                    <div class="input-with-prefix">
                        <span class="currency-prefix">${totals.currency}</span>
                        <input type="number" step="0.01" min="0" class="form-control form-control-sm text-right"
                               value="${item.unitPrice}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'unitPrice', this.value)">
                    </div>
                </td>
                <td style="width: 80px;">
                    <div class="input-with-suffix">
                        <input type="number" step="any" min="0" max="100" class="form-control form-control-sm text-right"
                               value="${item.taxRate}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'taxRate', this.value)">
                        <span class="suffix">%</span>
                    </div>
                </td>
                <td class="text-right font-semibold" style="width: 100px;">
                    ${totals.currency}${totals.lineCalculations[idx] ? totals.lineCalculations[idx].discountedAmount.toFixed(2) : '0.00'}
                </td>
                <td class="text-center" style="width: 40px;">
                    <button type="button" class="btn-icon btn-danger-icon" title="Remove Item"
                            onclick="window.invoiceBuilder.removeLineItem('${item.id}')">
                        ✕
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderTotalsSummary(totals) {
        const c = totals.currency;
        const setHtml = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };

        setHtml('calcSubtotal', `${c}${totals.subtotal.toFixed(2)}`);
        setHtml('calcDiscount', `-${c}${totals.overallDiscountAmount.toFixed(2)}`);
        setHtml('calcTax', `${c}${totals.totalTax.toFixed(2)}`);
        setHtml('calcShipping', `${c}${totals.shipping.toFixed(2)}`);
        setHtml('calcGrandTotal', `${c}${totals.grandTotal.toFixed(2)}`);
        setHtml('calcBalanceDue', `${c}${totals.balanceDue.toFixed(2)}`);
    }

    // --- Live Printable Invoice Canvas ---
    renderInvoicePreview(totals) {
        const previewContainer = document.getElementById('invoicePrintArea');
        if (!previewContainer) return;

        const settings = window.appStorage.getSettings();
        const c = totals.currency;

        previewContainer.style.setProperty('--invoice-accent', this.accentColor);

        previewContainer.innerHTML = `
            <div class="invoice-sheet" style="--accent: ${this.accentColor}">
                <!-- Header -->
                <div class="inv-header">
                    <div class="inv-brand">
                        ${settings.logo ? `<img src="${settings.logo}" alt="Logo" class="inv-logo">` : ''}
                        <h2 class="inv-company-name">${this.escapeHtml(settings.businessName || 'Your Company')}</h2>
                        ${settings.tagline ? `<p class="inv-tagline text-muted">${this.escapeHtml(settings.tagline)}</p>` : ''}
                        <div class="inv-company-details text-muted">
                            ${this.nl2br(this.escapeHtml(settings.address || ''))}
                            ${settings.taxId ? `<br>Tax ID: ${this.escapeHtml(settings.taxId)}` : ''}
                            ${settings.email ? `<br>Email: ${this.escapeHtml(settings.email)}` : ''}
                            ${settings.phone ? `<br>Phone: ${this.escapeHtml(settings.phone)}` : ''}
                        </div>
                    </div>
                    <div class="inv-meta">
                        <h1 class="inv-title" style="color: ${this.accentColor}">INVOICE</h1>
                        <div class="inv-meta-grid">
                            <div class="meta-label">Invoice #:</div>
                            <div class="meta-value font-bold">${this.escapeHtml(this.invoiceNumber || 'INV-001')}</div>
                            <div class="meta-label">Date:</div>
                            <div class="meta-value">${this.escapeHtml(this.date)}</div>
                            <div class="meta-label">Due Date:</div>
                            <div class="meta-value">${this.escapeHtml(this.dueDate)}</div>
                            ${this.poNumber ? `
                                <div class="meta-label">P.O. #:</div>
                                <div class="meta-value">${this.escapeHtml(this.poNumber)}</div>
                            ` : ''}
                            <div class="meta-label">Status:</div>
                            <div class="meta-value"><span class="status-badge status-${this.status.toLowerCase()}">${this.status}</span></div>
                        </div>
                    </div>
                </div>

                <div class="inv-divider"></div>

                <!-- Bill To -->
                <div class="inv-parties">
                    <div class="inv-bill-to">
                        <span class="section-label">BILL TO:</span>
                        <h3 class="client-name">${this.escapeHtml(this.client.name || 'Valued Client')}</h3>
                        ${this.client.company ? `<div class="client-company font-semibold">${this.escapeHtml(this.client.company)}</div>` : ''}
                        ${this.client.address ? `<div class="client-address text-muted">${this.nl2br(this.escapeHtml(this.client.address))}</div>` : ''}
                        ${this.client.taxId ? `<div class="client-tax text-muted">Tax ID: ${this.escapeHtml(this.client.taxId)}</div>` : ''}
                        ${this.client.email ? `<div class="client-email text-muted">Email: ${this.escapeHtml(this.client.email)}</div>` : ''}
                        ${this.client.phone ? `<div class="client-phone text-muted">Phone: ${this.escapeHtml(this.client.phone)}</div>` : ''}
                    </div>
                </div>

                <!-- Table -->
                <table class="inv-table">
                    <thead>
                        <tr style="background-color: ${this.accentColor}; color: #ffffff;">
                            <th class="text-left" style="width: 45%;">Item & Description</th>
                            <th class="text-center" style="width: 12%;">Qty</th>
                            <th class="text-right" style="width: 15%;">Unit Price</th>
                            <th class="text-right" style="width: 10%;">Tax</th>
                            <th class="text-right" style="width: 18%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.items.map((item, idx) => {
                            const line = totals.lineCalculations[idx] || { discountedAmount: 0 };
                            return `
                                <tr>
                                    <td>
                                        <div class="inv-item-title font-semibold">${this.escapeHtml(item.name)}</div>
                                        ${item.description ? `<div class="inv-item-desc text-muted">${this.escapeHtml(item.description)}</div>` : ''}
                                    </td>
                                    <td class="text-center">${item.quantity} ${this.escapeHtml(item.unit || '')}</td>
                                    <td class="text-right">${c}${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                    <td class="text-right">${parseFloat(item.taxRate || 0)}%</td>
                                    <td class="text-right font-semibold">${c}${line.discountedAmount.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <!-- Summary Section -->
                <div class="inv-summary-row">
                    <div class="inv-notes-block">
                        ${this.notes ? `
                            <div class="notes-section">
                                <span class="section-label">NOTES & INSTRUCTIONS:</span>
                                <p class="notes-text">${this.nl2br(this.escapeHtml(this.notes))}</p>
                            </div>
                        ` : ''}

                        ${settings.paymentDetails ? `
                            <div class="payment-section">
                                <span class="section-label">PAYMENT METHODS / BANK DETAILS:</span>
                                <div class="payment-box text-muted">
                                    ${this.nl2br(this.escapeHtml(settings.paymentDetails))}
                                </div>
                            </div>
                        ` : ''}

                        ${this.terms ? `
                            <div class="terms-section">
                                <span class="section-label">TERMS & CONDITIONS:</span>
                                <p class="terms-text text-muted">${this.nl2br(this.escapeHtml(this.terms))}</p>
                            </div>
                        ` : ''}
                    </div>

                    <div class="inv-totals-block">
                        <div class="totals-line">
                            <span>Subtotal:</span>
                            <span>${c}${totals.subtotal.toFixed(2)}</span>
                        </div>
                        ${totals.overallDiscountAmount > 0 ? `
                            <div class="totals-line text-success">
                                <span>Discount (${this.discountType === 'percent' ? this.discountValue + '%' : 'Flat'}):</span>
                                <span>-${c}${totals.overallDiscountAmount.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="totals-line">
                            <span>Tax:</span>
                            <span>${c}${totals.totalTax.toFixed(2)}</span>
                        </div>
                        ${totals.shipping > 0 ? `
                            <div class="totals-line">
                                <span>Shipping / Handling:</span>
                                <span>${c}${totals.shipping.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="totals-line grand-total-line" style="border-top: 2px solid ${this.accentColor}; color: ${this.accentColor}">
                            <span>Total:</span>
                            <span>${c}${totals.grandTotal.toFixed(2)}</span>
                        </div>
                        ${totals.paid > 0 ? `
                            <div class="totals-line text-muted">
                                <span>Amount Paid:</span>
                                <span>-${c}${totals.paid.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="totals-line balance-due-line">
                            <span>Balance Due:</span>
                            <span class="font-bold">${c}${totals.balanceDue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="inv-footer text-center text-muted">
                    <p>Thank you for choosing ${this.escapeHtml(settings.businessName || 'us')}!</p>
                </div>
            </div>
        `;
    }

    // --- Save & Print Actions ---
    saveInvoice() {
        const totals = this.calculateTotals();

        const invoiceRecord = {
            id: this.currentInvoiceId,
            invoiceNumber: this.invoiceNumber,
            date: this.date,
            dueDate: this.dueDate,
            poNumber: this.poNumber,
            client: { ...this.client },
            items: JSON.parse(JSON.stringify(this.items)),
            discountType: this.discountType,
            discountValue: this.discountValue,
            shippingFee: this.shippingFee,
            paidAmount: this.paidAmount,
            notes: this.notes,
            terms: this.terms,
            status: this.status,
            accentColor: this.accentColor,
            subtotal: totals.subtotal,
            totalTax: totals.totalTax,
            grandTotal: totals.grandTotal,
            balanceDue: totals.balanceDue
        };

        window.appStorage.saveInvoice(invoiceRecord);
        window.appStorage.incrementInvoiceNumber();

        window.showToast(`Invoice ${this.invoiceNumber} saved locally!`, 'success');

        if (window.invoiceHistoryManager) {
            window.invoiceHistoryManager.loadInvoices();
        }
    }

    loadSavedInvoice(invoice) {
        this.currentInvoiceId = invoice.id;
        this.invoiceNumber = invoice.invoiceNumber;
        this.date = invoice.date;
        this.dueDate = invoice.dueDate;
        this.poNumber = invoice.poNumber || '';
        this.client = invoice.client || { name: '', address: '' };
        this.items = JSON.parse(JSON.stringify(invoice.items || []));
        this.discountType = invoice.discountType || 'percent';
        this.discountValue = invoice.discountValue || 0;
        this.shippingFee = invoice.shippingFee || 0;
        this.paidAmount = invoice.paidAmount || 0;
        this.notes = invoice.notes || '';
        this.terms = invoice.terms || '';
        this.status = invoice.status || 'Draft';
        this.accentColor = invoice.accentColor || '#2563eb';

        this.syncStateToForm();
        this.calculateAndRender();
        window.switchTab('invoiceTab');
        window.showToast(`Loaded invoice ${this.invoiceNumber}`, 'info');
    }

    printInvoice() {
        window.print();
    }

    downloadPdf() {
        const element = document.querySelector('.invoice-sheet');
        if (!element) {
            window.showToast('Could not find invoice sheet to export.', 'error');
            return;
        }

        if (!window.html2pdf) {
            // Fallback to native print dialog
            window.showToast('Opening native print dialog for PDF export...', 'info');
            window.print();
            return;
        }

        window.showToast('Generating PDF file...', 'info');

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${this.invoiceNumber || 'Invoice'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            window.showToast('PDF downloaded successfully!', 'success');
        }).catch(err => {
            console.error('PDF export error:', err);
            window.print(); // fallback
        });
    }

    // --- Helpers ---
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    nl2br(str) {
        if (!str) return '';
        return str.replace(/\n/g, '<br>');
    }
}

// Global invoice builder instance
window.invoiceBuilder = new InvoiceBuilder();
