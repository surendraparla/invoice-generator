# InvoiceMaster — Offline Desktop Invoice Generator

A complete, private, 100% local desktop invoice generator built with cross-platform desktop web technology and packaged for Windows.

- **100% Offline & Local**: Zero cloud dependencies, zero external database, zero network calls. All data stays strictly on your local computer.
- **Excel Catalog Integration**: Import your existing product/service catalog from Excel (`.xlsx`, `.xls`) or `.csv` with intelligent column auto-mapping.
- **In-App Catalog Manager**: Add, edit, search, and delete catalog items directly from the interface.
- **Pixel-Perfect PDF Generation**: Generate crisp, professional invoices ready for printing or exporting as PDF.
- **Built for Windows (Developed & Tested on Mac)**: Developed using standard cross-platform desktop architecture so you can test and use it on macOS immediately, and compile standalone Windows executables (`.exe`) via automated GitHub Actions on real cloud Windows machines.

---

## 📁 Project Structure

```
invoice-generator/
├── index.html                        # Main desktop application window
├── main.js                           # Electron desktop wrapper process
├── preload.js                        # Secure Electron context isolation bridge
├── package.json                      # Build & packaging configurations for Windows (.exe)
├── run_local.py                      # Zero-dependency local launcher for Mac
├── start.command                     # Double-clickable macOS launcher script
├── sample-catalog.xlsx               # Ready-to-test sample product spreadsheet
├── assets/
│   ├── css/
│   │   ├── styles.css                # Premium modern desktop interface stylesheet
│   │   └── print.css                 # Dedicated high-fidelity vector print stylesheet
│   └── js/
│       ├── xlsx.full.min.js          # Offline SheetJS engine for Excel import/export
│       ├── html2pdf.bundle.min.js    # Offline PDF generation engine
│       ├── storage.js                # Local database & persistent storage engine
│       ├── catalog.js                # Catalog manager & Excel import logic
│       ├── invoice.js                # Invoice builder & real-time math engine
│       └── app.js                    # UI orchestrator, tabs, history & backups
└── .github/
    └── workflows/
        └── build-windows.yml         # Automated GitHub Actions workflow for Windows .exe builds
```

---

## 🚀 How to Run & Test on Your Mac Right Now

You don't need a Windows PC or even Node.js to use and test the entire application right away:

### Option 1: One-Click Launcher (Zero Installation)
Simply double-click:
```
start.command
```
*(Or in your terminal, run: `python3 run_local.py`)*

This starts a lightweight local loopback server (`http://127.0.0.1:54321`) and immediately opens the application in your browser. All offline features (Excel import, invoice builder, PDF printing, local storage) work identically.

### Option 2: Run via Electron (Native Desktop Window)
If you have Node.js installed:
```bash
npm install
npm start
```

---

## 📦 Using the Catalog Feature

### 1. Importing Your Excel Spreadsheet
1. Open the **Product Catalog** tab in the sidebar.
2. Click **📥 Import Excel / CSV**.
3. Select your `.xlsx`, `.xls`, or `.csv` file (you can test with the included `sample-catalog.xlsx`).
4. InvoiceMaster automatically maps common column names:
   - **SKU**: `SKU`, `Code`, `Item Code`, `Part Number`, `ID`
   - **Item Name**: `Item Name`, `Product`, `Name`, `Title`, `Description`
   - **Category**: `Category`, `Group`, `Type`, `Department`
   - **Unit**: `Unit`, `UOM`, `Unit of Measure`
   - **Price**: `Price`, `Unit Price`, `Rate`, `Cost`
   - **Tax Rate**: `Tax`, `Tax Rate`, `VAT`, `GST`, `Tax %`
   - **Description**: `Description`, `Details`, `Notes`
5. A preview modal displays the detected items. Choose **"+ Append"** or **"Replace Existing Catalog"**.

### 2. Managing Products in the UI
- Click **➕ Add Item** to insert new products/services directly from the app.
- Click the ✏️ **Edit** icon to adjust prices, descriptions, or tax rates anytime.
- Use the live search bar or category dropdown to filter your catalog in real time.
- Click **📤 Export to Excel** to save an updated `.xlsx` copy of your catalog to your computer.

---

## 🧾 Creating & Printing Invoices

1. Navigate to the **Create Invoice** tab.
2. **Invoice Details**:
   - Customize Invoice # (auto-increments sequentially from your settings, e.g., `INV-1001`).
   - Pick Issue Date and Due Date.
   - Choose a theme accent color using the live color picker.
3. **Bill To**: Enter client name, company, billing address, email, and tax ID.
4. **Line Items**:
   - Click **📦 + Add from Catalog** to search your catalog and insert items with 1 click.
   - Click **➕ Custom Item** to add ad-hoc services, hours, or charges.
   - Adjust quantities, unit prices, discounts, and tax rates inline.
5. **Adjustments & Totals**:
   - Apply an overall discount (% or fixed amount).
   - Enter shipping/handling fees or deposits already paid.
   - Real-time totals (Subtotal, Tax, Grand Total, Balance Due) update automatically on the right-hand canvas.
6. **Export & Print**:
   - Click **🖨️ Print / PDF**: Opens the system print dialog with dedicated print stylesheets for crisp vector output.
   - Click **📥 Download PDF**: Directly generates and downloads a `.pdf` file.
   - Click **💾 Save to History**: Stores the invoice locally so you can track payment status (`Draft`, `Sent`, `Paid`, `Overdue`).

---

## 🪟 How to Build the Windows `.exe` Without a Windows PC

Since you develop on a Mac, the recommended way to generate the Windows executable is via **GitHub Actions** (included in `.github/workflows/build-windows.yml`):

### Automated GitHub Actions Workflow (Free, Cloud Windows Machine)
1. Initialize a Git repository and push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of InvoiceMaster"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```
2. In your GitHub repository, click the **Actions** tab.
3. You will see the **"Build Windows Desktop App"** workflow automatically running on a clean `windows-latest` virtual machine.
4. Once completed (approx. 2-3 minutes), scroll to **Artifacts** at the bottom of the workflow run.
5. Download **`InvoiceMaster-Windows-x64.zip`**. Inside you will find:
   - `InvoiceMaster Setup 1.0.0.exe` — Complete Windows installer (with Desktop and Start Menu shortcuts).
   - `InvoiceMaster 1.0.0.exe` — Standalone portable executable (runs directly without installation, ideal for USB drives).

---

## 🔒 Privacy & Data Backups

- All data (catalog, past invoices, customer details, company settings) is stored purely in local device storage.
- In the **Settings & Backup** tab, you can click **"Download Full Backup (.json)"** at any time to export an exact offline copy of all your data.
- You can restore this backup on any other device (Mac or Windows) with a single click.
