NISAR DIGITAL SERVICES — MERGED WEBSITE UPDATE

This package keeps the existing NISAR website file layout and QR images while including the updated partner registration, admin approval, wallet, and service access flow.

CATALOGUE
- 2,497 services are present in backend/services.json (2,496 previous services plus UTI PAN Card Application).
- UTI PAN official portal: https://www.pan.utiitsl.com/

WEBSITE FLOW
- Public visitors see Retailer/Distributor registration and approved-partner login.
- Retailer application fee: ₹100; Distributor application fee: ₹200. Payment is by the supplied QR; Admin manually verifies the UTR before approval.
- Admin approval generates a Partner ID and one-time temporary password. Save and share it securely.
- Only approved partners can view services and submit wallet recharge requests. Recharge ₹100–₹3,000 is credited only after Admin verifies the UTR.
- Regular service charge: ₹50. FREE_INFORMATION service charge: ₹100. The charge is deducted before the portal link is shown.
- Government forms are completed by the customer/partner on the linked portal; this system does not submit government applications automatically.

GITHUB PAGES (FRONTEND)
Upload/replace these files at the repository root: index.html, app.js, style.css, recharge.html, admin-recharge.html, paytm-qr.jpg, airtel-qr.jpg. Keep the backend folder in the repository if you want a single combined ZIP backup, but GitHub Pages does not run Node.js backend code.

RENDER (BACKEND)
Deploy the backend folder as the Render service Root Directory: backend. Build command: npm install. Start command: npm start. Set environment variables: ADMIN_PIN, AUTH_SECRET, DATA_DIR=/var/data. Attach a persistent disk mounted at /var/data. Use a long private ADMIN_PIN and a separate long random AUTH_SECRET. Never put either secret in GitHub frontend files or send it to partners.

SECURITY / LIMITATIONS
- Payment is not automatically verified; Admin must check the actual bank/UPI transaction.
- Recharge submissions require an approved partner login and the mobile/role must match that partner.
- JSON file storage is single-instance only. For high-volume production, use transactional database storage and additional security review.
- Some service names use the general services.india.gov.in directory fallback where a specific official link is not configured. Check the destination before use.
- JavaScript syntax and ZIP integrity were checked. Full live payment, Render, and end-to-end browser tests have not been performed.
