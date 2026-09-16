# 🏢 Multi-Company & Multi-User Local Deployment Guide

This guide explains how to deploy the **ERP System** for **Multiple Companies** and **Multiple Staff/Users**, with each company running their own **Local Backend Server**.

---

## 🏗️ Deployment Architecture Overview

```
                          ┌─────────────────────────────────────────┐
                          │         COMPANY LOCAL SERVER PC         │
                          │   Runs: server.js (Port 3001)           │
                          │   Data: ./COMPANY DATA BASE/            │
                          └────────────────────┬────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │ (LAN / Wi-Fi Network)    │ (Wi-Fi / Mobile)         │ (VPN / Tailscale)
                    ▼                          ▼                          ▼
          ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
          │  Billing Counter  │      │  Accountant PC    │      │  Owner Laptop     │
          │ http://<IP>:3001  │      │ http://<IP>:3001  │      │ http://<IP>:3001  │
          └───────────────────┘      └───────────────────┘      └───────────────────┘
```

* **Data Privacy & Ownership**: All databases, invoices, vouchers, and contacts remain 100% local on your company's server PC.
* **Multi-User Access**: Any device (Windows, Mac, iPhone, Android, iPad) connected to the local Wi-Fi / LAN or Tailscale VPN can log in simultaneously.
* **Multi-Company Isolation**: Each company added in the system gets its own isolated folder under `COMPANY DATA BASE/<Company Name>/`.
* **Zero Client Installation**: Staff members do **NOT** need to install Node.js, git, or code. They simply open a web browser (Chrome / Edge / Safari) and go to `http://<SERVER-IP>:3001`.

---

## 🚀 Step 1: Server PC Setup (Run Once per Company)

Choose 1 computer in your office to act as the **Local Server PC** (e.g., Main Office Desktop, Accounting PC, or a Dedicated Mini PC).

1. Install **Node.js** (v18 or higher) on the Server PC from [nodejs.org](https://nodejs.org/).
2. Copy/extract the ERP project folder to your preferred directory (e.g. `C:\ERP`).
3. Open a Command Prompt / Terminal in the project folder and run:
   ```cmd
   npm install
   ```
4. Build the production web app:
   ```cmd
   npm run build
   ```

---

## ⚡ Step 2: Starting the Server

Simply double-click **`start.bat`** on the Server PC.

When started, the terminal will automatically detect and display your access URLs:

```text
==================================================================
🚀 ERP Server running on port 3001
📁 Data folder: C:\ERP\COMPANY DATA BASE
💻 Serving production frontend from: C:\ERP\dist
==================================================================
🌐 MULTI-USER ACCESS URLS:
   • Server PC:            http://localhost:3001
   • LAN / Wi-Fi Devices:  http://192.168.1.15:3001
==================================================================
```

---

## 📱 Step 3: Connecting Staff & Multi-User Devices (LAN / Wi-Fi)

1. Note the **LAN IP** shown in the server window (e.g. `http://192.168.1.15:3001`).
2. On any staff laptop, desktop, tablet, or phone connected to the **same Wi-Fi or LAN network**:
   * Open Chrome / Edge / Safari.
   * Enter the URL: `http://192.168.1.15:3001`.
3. The ERP interface will load instantly! Multiple users can log in, create invoices, view reports, and manage inventory concurrently.

> **Note on Windows Firewall**: If other PCs cannot connect, open Windows Defender Firewall on the Server PC and allow port `3001` or allow `node.exe` through private networks.

---

## 🌐 Step 4: Connecting Remote Users & Multi-Branch Offices (Tailscale VPN)

If you have staff working from home, owners traveling, or multiple branch offices:

1. Download and install **Tailscale** (free zero-config VPN) from [tailscale.com](https://tailscale.com/) on:
   * The Server PC
   * Remote staff laptops / phones
2. Sign in with the same Tailscale account on all devices.
3. Check the Server PC's **Tailscale IP** (e.g. `100.115.80.20`).
4. Remote staff can access the ERP from anywhere in the world by opening:
   `http://100.115.80.20:3001`

---

## ⚙️ Step 5: Configure Server Auto-Start on Windows Boot

To ensure the ERP server runs automatically 24/7 whenever the Server PC reboots:

1. Press `Win + R`, type `shell:startup`, and press Enter.
2. Create a shortcut to `start.bat` in this Startup folder.
3. Whenever the computer restarts or turns on, the ERP server will launch automatically.

---

## 🛡️ Step 6: Data Backup & Safety

All company data is organized cleanly inside the project directory:

```text
COMPANY DATA BASE/
 ├── companies.json                (List of registered companies)
 ├── Company A Pvt Ltd/
 │    ├── Company A - 2024-2025.json
 │    └── Company A - 2025-2026.json
 └── Company B Traders/
      └── Company B - 2025-2026.json
```

* **Automated Daily Backups**: Copies are automatically stored in `./BACKUP` and `./COMPANY DATA BASE_BACKUP`.
* **Manual Backup**: To back up everything, simply copy the `COMPANY DATA BASE` folder to a USB drive or Google Drive / OneDrive.
