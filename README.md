# Infominer PD Billing & Audit Platform

Welcome to the **Infominer PD Billing & Audit Platform**! This enterprise-grade application was built specifically for the Infominers Group to streamline, automate, and centralize the entire billing lifecycle and audit tracking for field verification and PD (Personal Discussion) cases. 

---

## 🎯 Objective
The primary objective of this tool is to eliminate manual errors, consolidate scattered data from various MS Excel sheets, and vastly accelerate the end-to-end billing process. Before this platform, billing relied on disparate spreadsheets, which were prone to human error and difficult to track. 

Now, this unified platform allows administrators to upload massive volumes of case records, dynamically map client data, automatically apply complex rate sheets, override specific case costs, generate GST-compliant tax invoices, and maintain a strict audit trail—all from a single secure dashboard.

---

## 🚀 How This Drastically Decreases Time
- **Automated Billing Engine:** Instead of manually calculating kilometers, flat rates, or slab deductions row-by-row, the built-in Billing Engine automatically processes thousands of records in seconds by matching them against Master Rate Sheets.
- **Dynamic Client Mapping:** Upload raw MIS sheets directly without reformatting them. The tool's dynamic column mapper lets you instantly match your client's column headers (e.g., "App_No" or "Applicant Name") to the system's standard fields.
- **1-Click Invoice Generation:** Generating invoices previously took hours of cross-referencing. Now, simply select a Client and Branch to automatically generate a branded, GST-calculated (CGST/SGST/IGST) tax invoice instantly. 
- **Centralized Data Storage:** Direct integration with MongoDB ensures you no longer have to hunt through shared drives or emails for the latest version of the billing sheet. 

---

## ⚡ How It Is Highly Efficient
- **Intelligent Deduplication & Error Handling:** The system flags duplicate cases and prevents double-billing automatically.
- **Bulk Export Capabilities:** Administrators can filter case records dynamically (by branch, state, client, or status) and export them perfectly formatted for Excel.
- **Strict Role-Based Access (RBAC):** Limits access strictly based on authorization levels (Admin vs. Manager) to prevent unauthorized tampering of rate sheets and financial data.
- **Audit Trails:** Every single action (editing a case rate, logging in, generating an invoice) is permanently tracked in a tamper-proof audit log synced to the database.

---

## 🌟 Why It Is Extremely User-Friendly
1. **Modern, Responsive UI:** The platform features a vibrant, glassmorphic, and dynamic interface designed to reduce cognitive load. 
2. **Real-time Analytics Dashboard:** Visualizes critical metrics (total billing amount, exceptions, billable cases, state-wise breakdowns) instantly on login without requiring manual pivot tables.
3. **Smart Autocomplete & Dropdowns:** Edit case branch names or select clients via intelligent `<datalist>` auto-completes rather than relying on manual typing. 
4. **Frictionless Onboarding:** Clear step-by-step numbers on panels (e.g., "1. Upload Sheet", "2. Map Data", "3. Apply Rates") guide the user naturally through the billing pipeline from start to finish.

---

## 💻 Technologies Used
This platform leverages a cutting-edge, high-performance tech stack:
- **Frontend Framework:** React 18 (with Vite for lightning-fast development and building)
- **Language:** TypeScript for end-to-end type safety and fewer runtime errors
- **Styling:** Vanilla CSS & TailwindCSS for responsive, beautiful, utility-first design
- **Icons & Graphics:** Lucide React for consistent, scalable vector iconography
- **Backend/API:** Node.js & Express.js server
- **Database:** MongoDB (via Mongoose) mapped dynamically to two clusters (`BILLING` and `InfominerGroup_db`)
- **Data Persistence:** IndexedDB (via localforage) for robust client-side caching, paired with immediate background syncs to MongoDB.
- **Excel Processing:** XLSX (SheetJS) for seamless, heavy-duty importing and exporting of spreadsheet data directly in the browser.
