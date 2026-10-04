/**
 * invoice.js - Proforma / GST Invoice Builder with Item Discounts & Indian Number Formatting
 * Matches exact format: Bill To, Consignee, Delivery, HSN, UOM, Qty, Rate, Discount, GST, Bank QR, Stamp.
 */

// Indian numbering system number-to-words converter
function numberToWordsIndian(num) {
    if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only.';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function twoDigits(n) {
        if (n < 20) return ones[n];
        const t = Math.floor(n / 10);
        const o = n % 10;
        return tens[t] + (o ? ' ' + ones[o] : '');
    }

    function threeDigits(n) {
        const h = Math.floor(n / 100);
        const rem = n % 100;
        let str = '';
        if (h > 0) str += ones[h] + ' Hundred';
        if (rem > 0) str += (str ? ' ' : '') + twoDigits(rem);
        return str;
    }

    let integerPart = Math.floor(num);
    let decimalPart = Math.round((num - integerPart) * 100);

    let parts = [];

    // Crores (1,00,00,000)
    const crores = Math.floor(integerPart / 10000000);
    integerPart %= 10000000;
    if (crores > 0) {
        parts.push(twoDigits(crores) + ' Crore');
    }

    // Lakhs (1,00,000)
    const lakhs = Math.floor(integerPart / 100000);
    integerPart %= 100000;
    if (lakhs > 0) {
        parts.push(twoDigits(lakhs) + ' Lakh');
    }

    // Thousands (1,000)
    const thousands = Math.floor(integerPart / 1000);
    integerPart %= 1000;
    if (thousands > 0) {
        parts.push(twoDigits(thousands) + ' Thousand');
    }

    // Hundreds & remaining
    if (integerPart > 0) {
        parts.push(threeDigits(integerPart));
    }

    let result = parts.filter(Boolean).join(' ') + ' Rupees';

    if (decimalPart > 0) {
        result += ' and ' + twoDigits(decimalPart) + ' Paise';
    }

    return result + ' Only.';
}

class InvoiceBuilder {
    constructor() {
        this.currentInvoiceId = null;
        this.docTitle = 'Proforma Invoice';
        this.docNumber = '0210';
        this.date = '02-10-2026';
        this.poNumberDate = '—';
        this.noOfBags = '—';
        this.terms = 'As per PI';
        this.status = 'Draft';

        this.billTo = {
            name: 'M/S. DASAM VENKATESWARA RAO',
            address: 'M/S. DASAM VENKATESWARA RAO 1-14/1\nANNAVARAM MAIN ROAD SRI SESHADRI DASAN\nLODGE BEHNDAPUDI ANNAVARAM DISST. KAKINADA- 533406',
            gstin: '37AJZPD2435N2ZK',
            stateName: 'ANDHRA PRADESH',
            stateCode: '37'
        };

        this.consignee = {
            name: 'M/S. DASAM VENKATESWARA RAO',
            address: 'M/S. DASAM VENKATESWARA RAO 1-14/1\nANNAVARAM MAIN ROAD SRI SESHADRI DASAN\nLODGE BEHNDAPUDI ANNAVARAM DISST. KAKINADA- 533406',
            gstin: '37AJZPD2435N2ZK',
            stateName: 'ANDHRA PRADESH',
            stateCode: '37'
        };

        this.delivery = {
            name: 'M/S. DASAM VENKATESWARA RAO',
            address: 'M/S. DASAM VENKATESWARA RAO 1-14/1 ANNAVARAM\nMAIN ROAD SRI SESHADRI DASAN LODGE BEHNDAPUDI\nANNAVARAM DISST. KAKINADA- 533406',
            gstin: '37AJZPD2435N2ZK',
            stateName: 'ANDHRA PRADESH',
            stateCode: '37',
            phone: '9071111116,9505207172'
        };

        this.items = [];
        this.gstRate = 18;
        this.freight = 'To pay';
        this.autoRoundOff = true;
        this.manualRoundOff = 0;
        this.qrCodeInstance = null;
    }

    init() {
        this.loadSampleData();
        this.setupEventListeners();
    }

    loadSampleData() {
        const settings = window.appStorage.getSettings();
        this.currentInvoiceId = 'inv-' + Date.now();
        this.docTitle = settings.defaultDocTitle || 'Proforma Invoice';
        this.docNumber = '0210';
        this.date = '02-10-2026';
        this.poNumberDate = '—';
        this.noOfBags = '—';
        this.terms = settings.defaultTerms || 'As per PI';
        this.gstRate = settings.defaultGstRate || 18;
        this.freight = 'To pay';

        // Sample 4 items from the provided example invoice + discount demo
        this.items = [
            {
                id: 'line-1',
                hsn: '85469010',
                description: '11kv- 3C X 35 INDOOR',
                uom: 'Nos',
                qty: 70,
                rate: 760.00,
                discountType: 'percent',
                discountValue: 0
            },
            {
                id: 'line-2',
                hsn: '85469010',
                description: '11kv- 3C X 35 OUTDOOR',
                uom: 'Nos',
                qty: 30,
                rate: 860.00,
                discountType: 'percent',
                discountValue: 0
            },
            {
                id: 'line-3',
                hsn: '85469010',
                description: '11KV POST INSULATOR',
                uom: 'Nos',
                qty: 100,
                rate: 130.00,
                discountType: 'percent',
                discountValue: 0
            },
            {
                id: 'line-4',
                hsn: '85469010',
                description: 'LT 1.1 KV PIN INSULATOR',
                uom: 'Nos',
                qty: 100,
                rate: 80.00,
                discountType: 'percent',
                discountValue: 0
            }
        ];

        this.syncStateToForm();
        this.calculateAndRender();
    }

    resetToNewInvoice() {
        const settings = window.appStorage.getSettings();
        const nextNum = String(settings.nextInvoiceNumber || 211).padStart(4, '0');

        this.currentInvoiceId = 'inv-' + Date.now();
        this.docTitle = settings.defaultDocTitle || 'Proforma Invoice';
        this.docNumber = nextNum;

        // Current Date in DD-MM-YYYY format
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        this.date = `${dd}-${mm}-${yyyy}`;

        this.poNumberDate = '—';
        this.noOfBags = '—';
        this.terms = settings.defaultTerms || 'As per PI';
        this.status = 'Draft';

        this.items = [
            {
                id: 'line-' + Date.now(),
                hsn: '85469010',
                description: 'Product or Service Description',
                uom: 'Nos',
                qty: 10,
                rate: 1000.00,
                discountType: 'percent',
                discountValue: 0
            }
        ];

        this.syncStateToForm();
        this.calculateAndRender();
        window.showToast('Initialized new invoice form.', 'info');
    }

    syncStateToForm() {
        this.setVal('docTitleInput', this.docTitle);
        this.setVal('docNumberInput', this.docNumber);
        this.setVal('invDateInput', this.date);
        this.setVal('poNumberDateInput', this.poNumberDate);
        this.setVal('noOfBagsInput', this.noOfBags);
        this.setVal('invTermsInput', this.terms);
        this.setVal('invStatusSelect', this.status);

        // Bill To
        this.setVal('billToNameInput', this.billTo.name);
        this.setVal('billToAddressInput', this.billTo.address);
        this.setVal('billToGstinInput', this.billTo.gstin);
        this.setVal('billToStateNameInput', this.billTo.stateName);
        this.setVal('billToStateCodeInput', this.billTo.stateCode);

        // Consignee
        this.setVal('consigneeNameInput', this.consignee.name);
        this.setVal('consigneeAddressInput', this.consignee.address);
        this.setVal('consigneeGstinInput', this.consignee.gstin);
        this.setVal('consigneeStateNameInput', this.consignee.stateName);
        this.setVal('consigneeStateCodeInput', this.consignee.stateCode);

        // Delivery
        this.setVal('deliveryNameInput', this.delivery.name);
        this.setVal('deliveryAddressInput', this.delivery.address);
        this.setVal('deliveryGstinInput', this.delivery.gstin);
        this.setVal('deliveryStateNameInput', this.delivery.stateName);
        this.setVal('deliveryStateCodeInput', this.delivery.stateCode);
        this.setVal('deliveryPhoneInput', this.delivery.phone || '');

        // Summary controls
        this.setVal('invGstRateInput', this.gstRate);
        this.setVal('invFreightInput', this.freight);
    }

    setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined ? val : '';
    }

    setupEventListeners() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    fn(e.target.value);
                    this.calculateAndRender();
                });
            }
        };

        bind('docTitleInput', v => this.docTitle = v);
        bind('docNumberInput', v => this.docNumber = v);
        bind('invDateInput', v => this.date = v);
        bind('poNumberDateInput', v => this.poNumberDate = v);
        bind('noOfBagsInput', v => this.noOfBags = v);
        bind('invTermsInput', v => this.terms = v);

        // Bill to
        bind('billToNameInput', v => this.billTo.name = v);
        bind('billToAddressInput', v => this.billTo.address = v);
        bind('billToGstinInput', v => this.billTo.gstin = v);
        bind('billToStateNameInput', v => this.billTo.stateName = v);
        bind('billToStateCodeInput', v => this.billTo.stateCode = v);

        // Consignee
        bind('consigneeNameInput', v => this.consignee.name = v);
        bind('consigneeAddressInput', v => this.consignee.address = v);
        bind('consigneeGstinInput', v => this.consignee.gstin = v);
        bind('consigneeStateNameInput', v => this.consignee.stateName = v);
        bind('consigneeStateCodeInput', v => this.consignee.stateCode = v);

        // Delivery
        bind('deliveryNameInput', v => this.delivery.name = v);
        bind('deliveryAddressInput', v => this.delivery.address = v);
        bind('deliveryGstinInput', v => this.delivery.gstin = v);
        bind('deliveryStateNameInput', v => this.delivery.stateName = v);
        bind('deliveryStateCodeInput', v => this.delivery.stateCode = v);
        bind('deliveryPhoneInput', v => this.delivery.phone = v);

        // GST & Freight
        bind('invGstRateInput', v => this.gstRate = parseFloat(v) || 0);
        bind('invFreightInput', v => this.freight = v);

        const statusSelect = document.getElementById('invStatusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.status = e.target.value;
                this.calculateAndRender();
            });
        }
    }

    copyBillToConsignee() {
        this.consignee = JSON.parse(JSON.stringify(this.billTo));
        this.setVal('consigneeNameInput', this.consignee.name);
        this.setVal('consigneeAddressInput', this.consignee.address);
        this.setVal('consigneeGstinInput', this.consignee.gstin);
        this.setVal('consigneeStateNameInput', this.consignee.stateName);
        this.setVal('consigneeStateCodeInput', this.consignee.stateCode);
        this.calculateAndRender();
        window.showToast('Copied Bill To details to Consignee', 'info');
    }

    copyBillToDelivery() {
        this.delivery.name = this.billTo.name;
        this.delivery.address = this.billTo.address;
        this.delivery.gstin = this.billTo.gstin;
        this.delivery.stateName = this.billTo.stateName;
        this.delivery.stateCode = this.billTo.stateCode;
        this.setVal('deliveryNameInput', this.delivery.name);
        this.setVal('deliveryAddressInput', this.delivery.address);
        this.setVal('deliveryGstinInput', this.delivery.gstin);
        this.setVal('deliveryStateNameInput', this.delivery.stateName);
        this.setVal('deliveryStateCodeInput', this.delivery.stateCode);
        this.calculateAndRender();
        window.showToast('Copied Bill To details to Delivery', 'info');
    }

    // --- Line Items & Discounts ---
    addItemFromCatalog(catalogItem) {
        this.items.push({
            id: 'line-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            hsn: catalogItem.hsn || '85469010',
            description: catalogItem.name,
            uom: catalogItem.unit || 'Nos',
            qty: 1,
            rate: parseFloat(catalogItem.price) || 0,
            discountType: 'percent',
            discountValue: parseFloat(catalogItem.defaultDiscount) || 0
        });
        this.calculateAndRender();
    }

    addCustomItem() {
        this.items.push({
            id: 'line-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            hsn: '85469010',
            description: '',
            uom: 'Nos',
            qty: 1,
            rate: 0.00,
            discountType: 'percent',
            discountValue: 0
        });
        this.calculateAndRender();
    }

    removeLineItem(id) {
        if (this.items.length <= 1) {
            window.showToast('An invoice must have at least one item.', 'info');
            return;
        }
        this.items = this.items.filter(item => item.id !== id);
        this.calculateAndRender();
    }

    updateLineItem(id, field, value) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (['qty', 'rate', 'discountValue'].includes(field)) {
            item[field] = parseFloat(value) || 0;
        } else {
            item[field] = value;
        }

        this.calculateAndRender();
    }

    // --- Financial Math Engine ---
    calculateTotals() {
        let subtotal = 0;
        let totalDiscount = 0;
        let hasAnyDiscount = false;

        const lineCalculations = this.items.map(item => {
            const qty = Math.max(0, parseFloat(item.qty) || 0);
            const rate = Math.max(0, parseFloat(item.rate) || 0);
            const gross = qty * rate;

            let discAmount = 0;
            const discVal = parseFloat(item.discountValue) || 0;

            if (discVal > 0) {
                hasAnyDiscount = true;
                if (item.discountType === 'percent') {
                    discAmount = gross * (discVal / 100);
                } else {
                    discAmount = discVal;
                }
            }

            discAmount = Math.min(gross, Math.max(0, discAmount));
            const netAmount = Math.max(0, gross - discAmount);

            subtotal += netAmount;
            totalDiscount += discAmount;

            return {
                ...item,
                gross,
                discAmount,
                netAmount
            };
        });

        // GST calculation
        const gstRate = Math.max(0, parseFloat(this.gstRate) || 0);
        const gstAmount = subtotal * (gstRate / 100);
        const subtotalWithGst = subtotal + gstAmount;

        // Round Off calculation
        const roundedTotal = Math.round(subtotalWithGst);
        const roundOffDiff = roundedTotal - subtotalWithGst;

        const totalPayable = roundedTotal;
        const words = numberToWordsIndian(totalPayable);

        return {
            subtotal,
            totalDiscount,
            hasAnyDiscount,
            gstRate,
            gstAmount,
            subtotalWithGst,
            roundOffDiff,
            totalPayable,
            words,
            lineCalculations
        };
    }

    calculateAndRender() {
        const totals = this.calculateTotals();
        this.renderLineItemsEditor(totals);
        this.renderTotalsSummary(totals);
        this.renderInvoicePreview(totals);
        if (window.updatePreviewScaling) {
            window.updatePreviewScaling();
        }
    }

    renderLineItemsEditor(totals) {
        const container = document.getElementById('invoiceLineItemsBody');
        if (!container) return;

        container.innerHTML = this.items.map((item, idx) => {
            const calc = totals.lineCalculations[idx] || { netAmount: 0 };
            return `
                <tr class="line-item-row" data-id="${item.id}">
                    <td style="width: 30px;" class="text-center font-bold text-muted">${idx + 1}</td>
                    <td style="width: 105px;">
                        <input type="text" class="form-control form-control-sm font-mono"
                               placeholder="HSN" value="${this.escapeHtml(item.hsn || '')}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'hsn', this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm font-semibold"
                               placeholder="Description" value="${this.escapeHtml(item.description)}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'description', this.value)">
                    </td>
                    <td style="width: 65px;">
                        <input type="text" class="form-control form-control-sm text-center"
                               placeholder="Nos" value="${this.escapeHtml(item.uom || 'Nos')}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'uom', this.value)">
                    </td>
                    <td style="width: 65px;">
                        <input type="number" step="any" min="0" class="form-control form-control-sm text-center"
                               value="${item.qty}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'qty', this.value)">
                    </td>
                    <td style="width: 95px;">
                        <input type="number" step="0.01" min="0" class="form-control form-control-sm text-right font-mono"
                               value="${item.rate}"
                               oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'rate', this.value)">
                    </td>
                    <!-- Item Discount Field -->
                    <td style="width: 110px;">
                        <div style="display: flex; gap: 2px;">
                            <input type="number" step="any" min="0" class="form-control form-control-sm text-right"
                                   placeholder="0" value="${item.discountValue || 0}"
                                   oninput="window.invoiceBuilder.updateLineItem('${item.id}', 'discountValue', this.value)">
                            <select class="form-control form-control-sm" style="padding: 2px 4px; width: 42px;"
                                    onchange="window.invoiceBuilder.updateLineItem('${item.id}', 'discountType', this.value)">
                                <option value="percent" ${item.discountType === 'percent' ? 'selected' : ''}>%</option>
                                <option value="flat" ${item.discountType === 'flat' ? 'selected' : ''}>₹</option>
                            </select>
                        </div>
                    </td>
                    <td class="text-right font-bold font-mono" style="width: 105px;">
                        ₹${calc.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td class="text-center" style="width: 35px;">
                        <button type="button" class="btn-icon btn-danger-icon" title="Remove"
                                onclick="window.invoiceBuilder.removeLineItem('${item.id}')">
                            ✕
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderTotalsSummary(totals) {
        const fmt = n => '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const set = (id, str) => {
            const el = document.getElementById(id);
            if (el) el.textContent = str;
        };

        set('calcSubtotal', fmt(totals.subtotal));
        set('calcGstText', `GST (${totals.gstRate}%):`);
        set('calcGst', fmt(totals.gstAmount));
        set('calcSubtotalGst', fmt(totals.subtotalWithGst));

        const roundSign = totals.roundOffDiff >= 0 ? '+' : '';
        set('calcRoundOff', `${roundSign}${totals.roundOffDiff.toFixed(2)}`);
        set('calcFreight', this.freight || 'To pay');
        set('calcTotalPayable', fmt(totals.totalPayable));
        set('calcWords', totals.words);
    }

    // --- Live Exact Replica of Invoice Sheet ---
    renderInvoicePreview(totals) {
        const previewContainer = document.getElementById('invoicePrintArea');
        if (!previewContainer) return;

        const settings = window.appStorage.getSettings();
        const fmt = n => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const roundSign = totals.roundOffDiff >= 0 ? '+' : '';
        const roundOffFormatted = `${roundSign}${totals.roundOffDiff.toFixed(2)}`;

        // Minimum 5 rows to match clean paper grid layout
        const rowCount = Math.max(5, this.items.length);
        const paddedRows = [];

        for (let i = 0; i < rowCount; i++) {
            if (i < this.items.length) {
                const item = this.items[i];
                const calc = totals.lineCalculations[i];
                paddedRows.push({
                    idx: i + 1,
                    hsn: item.hsn || '',
                    description: item.description || '',
                    uom: item.uom || '',
                    qty: item.qty > 0 ? item.qty : '',
                    rate: item.rate > 0 ? fmt(item.rate) : '',
                    disc: item.discountValue > 0 ? (item.discountType === 'percent' ? `${item.discountValue}%` : `₹${item.discountValue}`) : '',
                    amount: calc.netAmount > 0 ? fmt(calc.netAmount) : ''
                });
            } else {
                // Empty blank row padding
                paddedRows.push({
                    idx: i + 1,
                    hsn: '',
                    description: '',
                    uom: '',
                    qty: '',
                    rate: '',
                    disc: '',
                    amount: ''
                });
            }
        }

        const showDiscCol = totals.hasAnyDiscount;

        previewContainer.innerHTML = `
            <div class="exact-invoice-sheet">
                <!-- TOP HEADER -->
                <div class="ex-top-header">
                    <div class="ex-logo-box">
                        ${settings.logo ? `
                            <img src="${settings.logo}" alt="Company Logo" class="ex-logo-img">
                        ` : `
                            <div class="ex-logo-text-brand">
                                <span class="ex-logo-main">${settings.brandLogoText || 'VIKCHEM'}</span>
                                <span class="ex-logo-sub">${settings.brandSubtitle || 'INNOVATION FOR NATION'}</span>
                            </div>
                        `}
                    </div>

                    <div class="ex-company-center">
                        <h2 class="ex-company-title">${this.escapeHtml(settings.businessName)}</h2>
                        <p class="ex-company-address">${this.escapeHtml(settings.address)}</p>
                        <p class="ex-tax-numbers">
                            <strong>GSTIN / UIN:</strong> ${this.escapeHtml(settings.gstin)} | <strong>ARN No.:</strong> ${this.escapeHtml(settings.arn)}
                        </p>
                        <p class="ex-contact-line">
                            Email: <strong>${this.escapeHtml(settings.email)}</strong> | Phone: <strong>${this.escapeHtml(settings.phone)}</strong>
                        </p>
                    </div>

                    <div class="ex-doc-badge">
                        <div class="ex-doc-label">DOCUMENT</div>
                        <div class="ex-doc-title">${this.escapeHtml(this.docTitle)}</div>
                        <div class="ex-doc-number">No. ${this.escapeHtml(this.docNumber)}</div>
                    </div>
                </div>

                <!-- 3 PARTIES SECTION: BILL TO, CONSIGNEE, DELIVERY -->
                <div class="ex-parties-grid">
                    <!-- Column 1: Bill To -->
                    <div class="ex-party-card">
                        <div class="ex-party-header color-red">BILL TO</div>
                        <div class="ex-party-body">
                            <div class="ex-client-name font-bold">${this.escapeHtml(this.billTo.name)}</div>
                            <div class="ex-client-address">${this.nl2br(this.escapeHtml(this.billTo.address))}</div>
                            <div class="ex-client-gstin"><strong>GSTIN/UIN:</strong> ${this.escapeHtml(this.billTo.gstin)}</div>
                            <div class="ex-client-state"><strong>State Name :</strong>${this.escapeHtml(this.billTo.stateName)}, <strong>Code :</strong> ${this.escapeHtml(this.billTo.stateCode)}</div>
                        </div>
                    </div>

                    <!-- Column 2: Consignee -->
                    <div class="ex-party-card">
                        <div class="ex-party-header color-green">CONSIGNEE</div>
                        <div class="ex-party-body">
                            <div class="ex-client-name font-bold">${this.escapeHtml(this.consignee.name)}</div>
                            <div class="ex-client-address">${this.nl2br(this.escapeHtml(this.consignee.address))}</div>
                            <div class="ex-client-gstin"><strong>GSTIN/UIN:</strong> ${this.escapeHtml(this.consignee.gstin)}</div>
                            <div class="ex-client-state"><strong>State Name :</strong>${this.escapeHtml(this.consignee.stateName)}, <strong>Code :</strong> ${this.escapeHtml(this.consignee.stateCode)}</div>
                        </div>
                    </div>

                    <!-- Column 3: Delivery -->
                    <div class="ex-party-card">
                        <div class="ex-party-header color-gold">DELIVERY</div>
                        <div class="ex-party-body">
                            <div class="ex-client-name font-bold">${this.escapeHtml(this.delivery.name)}</div>
                            <div class="ex-client-address">${this.nl2br(this.escapeHtml(this.delivery.address))}</div>
                            <div class="ex-client-gstin"><strong>GSTIN/UIN:</strong> ${this.escapeHtml(this.delivery.gstin)}</div>
                            <div class="ex-client-state"><strong>State Name :</strong>${this.escapeHtml(this.delivery.stateName)}, <strong>Code :</strong> ${this.escapeHtml(this.delivery.stateCode)}</div>
                            ${this.delivery.phone ? `<div class="ex-client-phone">✆ ${this.escapeHtml(this.delivery.phone)}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- 4 BOX META BAR: PO NO, DATE, BAGS, TERMS -->
                <div class="ex-meta-bar">
                    <div class="ex-meta-cell">
                        <span class="ex-meta-title">PO NO. & DATE</span>
                        <span class="ex-meta-val">${this.escapeHtml(this.poNumberDate)}</span>
                    </div>
                    <div class="ex-meta-cell">
                        <span class="ex-meta-title">DATE</span>
                        <span class="ex-meta-val">${this.escapeHtml(this.date)}</span>
                    </div>
                    <div class="ex-meta-cell">
                        <span class="ex-meta-title">NO. OF BAGS</span>
                        <span class="ex-meta-val">${this.escapeHtml(this.noOfBags)}</span>
                    </div>
                    <div class="ex-meta-cell">
                        <span class="ex-meta-title">TERMS</span>
                        <span class="ex-meta-val">${this.escapeHtml(this.terms)}</span>
                    </div>
                </div>

                <!-- LINE ITEMS TABLE -->
                <table class="ex-items-table">
                    <thead>
                        <tr>
                            <th style="width: 4%;">#</th>
                            <th style="width: 14%;">HSN CODE</th>
                            <th style="width: ${showDiscCol ? '42%' : '50%'};" class="text-left">DESCRIPTION</th>
                            <th style="width: 7%;">UOM</th>
                            <th style="width: 7%;">QTY</th>
                            <th style="width: 12%;" class="text-right">RATE (₹)</th>
                            ${showDiscCol ? '<th style="width: 8%;" class="text-center">DISC</th>' : ''}
                            <th style="width: 14%;" class="text-right">AMOUNT (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paddedRows.map(row => `
                            <tr>
                                <td class="text-center">${row.idx}</td>
                                <td class="text-center font-mono">${row.hsn}</td>
                                <td class="text-left font-bold">${this.escapeHtml(row.description)}</td>
                                <td class="text-center">${row.uom}</td>
                                <td class="text-center font-bold">${row.qty}</td>
                                <td class="text-right font-mono">${row.rate}</td>
                                ${showDiscCol ? `<td class="text-center text-muted font-bold">${row.disc}</td>` : ''}
                                <td class="text-right font-mono font-bold">${row.amount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- TOTALS SECTION & CALCULATION GRID -->
                <div class="ex-calc-container">
                    <div class="ex-calc-left">
                        <div class="ex-currency-note">All amounts in Indian Rupees (₹)</div>
                    </div>

                    <div class="ex-calc-right">
                        <div class="ex-calc-row">
                            <span class="ex-c-label">Sub Total</span>
                            <span class="ex-c-val">₹ ${fmt(totals.subtotal)}</span>
                        </div>
                        <div class="ex-calc-row">
                            <span class="ex-c-label">GST (${totals.gstRate}%)</span>
                            <span class="ex-c-val">₹ ${fmt(totals.gstAmount)}</span>
                        </div>
                        <div class="ex-calc-row">
                            <span class="ex-c-label">Sub Total w/ GST</span>
                            <span class="ex-c-val">₹ ${fmt(totals.subtotalWithGst)}</span>
                        </div>
                        <div class="ex-calc-row">
                            <span class="ex-c-label">Round Off</span>
                            <span class="ex-c-val">${roundOffFormatted}</span>
                        </div>
                        <div class="ex-calc-row">
                            <span class="ex-c-label">Freight</span>
                            <span class="ex-c-val">${this.escapeHtml(this.freight)}</span>
                        </div>
                        <div class="ex-calc-row ex-total-payable-row">
                            <span class="ex-c-label font-bold">Total Payable</span>
                            <span class="ex-c-val font-bold">₹ ${fmt(totals.totalPayable)}</span>
                        </div>
                    </div>
                </div>

                <!-- AMOUNT IN WORDS STRIP -->
                <div class="ex-words-strip">
                    <strong>Amount in Words:</strong> ${this.escapeHtml(totals.words)}
                </div>

                <!-- BANK DETAILS & SIGNATURE FOOTER -->
                <div class="ex-footer-box">
                    <!-- Bank details -->
                    <div class="ex-bank-column">
                        <div class="ex-bank-title">BANK DETAILS</div>
                        <div class="ex-bank-info-grid">
                            <div class="ex-b-line"><strong>Name:</strong> ${this.escapeHtml(settings.accountName || settings.businessName)}</div>
                            <div class="ex-b-line"><strong>Bank:</strong> ${this.escapeHtml(settings.bankName)} &nbsp; <strong>A/C No.:</strong> ${this.escapeHtml(settings.accountNo)}</div>
                            <div class="ex-b-line"><strong>IFSC:</strong> ${this.escapeHtml(settings.ifsc)} &nbsp; <strong>Place:</strong> ${this.escapeHtml(settings.branchPlace)}</div>
                        </div>

                        <!-- Offline QR Code -->
                        <div class="ex-qr-wrapper">
                            <div id="invoiceQrCodeElement"></div>
                            <span class="ex-qr-label">${this.escapeHtml(settings.accountName || settings.businessName)}</span>
                        </div>
                    </div>

                    <!-- Signatory -->
                    <div class="ex-signature-column">
                        <div class="ex-sig-top">
                            <p>Thanking You,</p>
                            <p>We Remain</p>
                            <p>Yours Faithfully</p>
                            <p class="font-bold">For ${this.escapeHtml(settings.businessName)}</p>
                        </div>

                        <!-- Seal Graphic -->
                        <div class="ex-seal-container">
                            <div class="ex-seal-circle">
                                <span class="seal-top">${this.escapeHtml(settings.companySealText || 'Vikram Power Technologies')}</span>
                                <span class="seal-mid">Yamuna Nagar</span>
                                <span class="seal-bot">Authorized</span>
                            </div>
                        </div>

                        <div class="ex-sig-bottom">
                            <div class="sig-line"></div>
                            <div class="sig-label">Authorized Signatory</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Generate QR code safely using qrcode.js
        this.renderQrCode(totals);
    }

    renderQrCode(totals) {
        setTimeout(() => {
            const qrContainer = document.getElementById('invoiceQrCodeElement');
            if (!qrContainer) return;
            qrContainer.innerHTML = '';

            const settings = window.appStorage.getSettings();
            // UPI Payment Link
            const upiPayload = `upi://pay?pa=${settings.upiId || 'sales@vptpl'}&pn=${encodeURIComponent(settings.businessName)}&am=${totals.totalPayable}&cu=INR`;

            if (window.QRCode) {
                try {
                    new QRCode(qrContainer, {
                        text: upiPayload,
                        width: 72,
                        height: 72,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } catch (e) {
                    console.error('QR code generation error', e);
                }
            }
        }, 50);
    }

    // --- Save, Print, and Load ---
    saveInvoice() {
        const totals = this.calculateTotals();

        const record = {
            id: this.currentInvoiceId,
            docTitle: this.docTitle,
            invoiceNumber: this.docNumber,
            date: this.date,
            poNumberDate: this.poNumberDate,
            noOfBags: this.noOfBags,
            terms: this.terms,
            status: this.status,
            billTo: { ...this.billTo },
            consignee: { ...this.consignee },
            delivery: { ...this.delivery },
            items: JSON.parse(JSON.stringify(this.items)),
            gstRate: this.gstRate,
            freight: this.freight,
            subtotal: totals.subtotal,
            gstAmount: totals.gstAmount,
            roundOffDiff: totals.roundOffDiff,
            totalPayable: totals.totalPayable,
            words: totals.words
        };

        window.appStorage.saveInvoice(record);
        window.appStorage.incrementInvoiceNumber();
        window.showToast(`Saved ${this.docTitle} No. ${this.docNumber}!`, 'success');

        if (window.invoiceHistoryManager) {
            window.invoiceHistoryManager.loadInvoices();
        }
    }

    loadSavedInvoice(inv) {
        this.currentInvoiceId = inv.id;
        this.docTitle = inv.docTitle || 'Proforma Invoice';
        this.docNumber = inv.invoiceNumber || '0210';
        this.date = inv.date || '02-10-2026';
        this.poNumberDate = inv.poNumberDate || '—';
        this.noOfBags = inv.noOfBags || '—';
        this.terms = inv.terms || 'As per PI';
        this.status = inv.status || 'Draft';

        this.billTo = inv.billTo || { ...this.billTo };
        this.consignee = inv.consignee || { ...this.consignee };
        this.delivery = inv.delivery || { ...this.delivery };

        this.items = JSON.parse(JSON.stringify(inv.items || []));
        this.gstRate = inv.gstRate || 18;
        this.freight = inv.freight || 'To pay';

        this.syncStateToForm();
        this.calculateAndRender();
        window.switchTab('invoiceTab');
        window.showToast(`Loaded Invoice No. ${this.docNumber}`, 'info');
    }

    printInvoice() {
        window.print();
    }

    downloadPdf() {
        const element = document.querySelector('.exact-invoice-sheet');
        if (!element) {
            window.showToast('Could not find invoice sheet to export.', 'error');
            return;
        }

        if (!window.html2pdf) {
            window.print();
            return;
        }

        window.showToast('Generating PDF file...', 'info');

        const opt = {
            margin: [8, 8, 8, 8],
            filename: `${this.docTitle.replace(/\s+/g, '_')}_No_${this.docNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            window.showToast('PDF downloaded successfully!', 'success');
        }).catch(err => {
            console.error('PDF error:', err);
            window.print();
        });
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

    nl2br(str) {
        if (!str) return '';
        return str.replace(/\n/g, '<br>');
    }
}

// Global invoice builder instance
window.invoiceBuilder = new InvoiceBuilder();
