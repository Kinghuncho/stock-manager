# 📦 Stock Manager

A full-stack business management and inventory application for managing products, stock, purchases, sales, expenses, and business performance from one place.

🌐 **Live Demo:** https://kinghuncho.github.io/stock-manager/

📂 **Source Code:** https://github.com/Kinghuncho/stock-manager

---

## 🚀 Overview

Stock Manager is a full-stack web application designed to simplify day-to-day inventory and business record management.

The application provides a centralized interface for managing products and stock while recording purchases, sales, and expenses. It also provides dashboard and reporting functionality for monitoring business performance.

The project includes a browser-based frontend, an Express.js API, PostgreSQL database integration, authentication, session management, role-based store access, and deployment configuration.

---

## ✨ Features

### 📊 Dashboard
- Inventory statistics
- Stock quantities
- Inventory value
- Potential revenue
- Sales totals
- Expense totals
- Business performance overview

### 📦 Inventory Management
- Add products
- Edit products
- Delete products
- Product categories
- Stock quantity tracking
- Low-stock limits
- Buying prices
- Selling prices
- Store-based inventory access

### 🛒 Purchases
- Record purchases
- Select products
- Track quantities
- Record unit costs
- Supplier information
- Purchase dates
- Reference numbers
- Automatically increase stock after purchases

### 💰 Sales
- Record sales
- Track quantities sold
- Record selling prices
- Customer information
- Sale dates
- Automatically reduce stock after sales
- Prevent sales when available stock is insufficient

### 💸 Expenses
- Record business expenses
- Categorize expenses
- Track spending
- Add descriptions
- Track expense dates

### 📈 Reports
- Sales reports
- Purchase reports
- Expense reports
- Revenue calculations
- Cost of goods sold
- Gross profit
- Net profit
- Date-range reporting

### 🔐 Authentication & Access Control
- User registration
- User login
- Secure password hashing
- Session-based authentication
- Session expiration
- Store memberships
- Role-based permissions
- Owner, manager and staff access levels

### 🛡️ Security
- HTTP security headers with Helmet
- CORS configuration
- HTTP-only session cookies
- Password hashing with Argon2
- Environment-based configuration
- Protected API routes

---

## 🛠️ Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- REST API

### Database
- PostgreSQL

### Authentication & Security
- Argon2
- Cookie-based sessions
- Helmet
- CORS

### Validation & Configuration
- Zod
- dotenv

### Development
- Git
- GitHub
- Visual Studio Code

### Deployment
- Render deployment configuration
- Static frontend hosting
- PostgreSQL database

---

## 🏗️ Architecture

```text
                  ┌─────────────────────┐
                  │    Stock Manager    │
                  │      Frontend       │
                  │ HTML / CSS / JS     │
                  └──────────┬──────────┘
                             │
                             │ REST API
                             ▼
                  ┌─────────────────────┐
                  │    Express.js API   │
                  │     Node.js         │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │     PostgreSQL      │
                  │      Database       │
                  └─────────────────────┘
                  
📁 Main Project Components
stock-manager/
│
├── index.html
├── style.css
├── script.js
│
├── api-client.js
├── cloud-auth.js
├── cloud-integration.js
├── cloud-inventory.js
├── cloud-pages.js
│
├── server.js
├── package.json
├── render.yaml
└── .env.example
🔌 API Functionality

The backend provides API endpoints for:

Authentication
User sessions
Store membership
Product management
Purchases
Sales
Expenses
Dashboard statistics
Business reports
Health monitoring

The API also validates requests, protects routes using authentication middleware, and applies store-level permissions.
🧠 Development Experience

Building Stock Manager gave me hands-on experience taking a business application from an initial idea through development, debugging, testing and deployment.

During development I worked on:

Responsive interface design
JavaScript application logic
REST API integration
PostgreSQL database integration
Authentication workflows
Session management
Role-based access control
Inventory business logic
Sales and purchase workflows
Financial calculations
API validation
Debugging and troubleshooting
Git and GitHub workflows
Deployment configuration

A major part of the project involved identifying and resolving real application issues, including JavaScript errors, modal functionality, data handling and frontend/backend integration
🎯 Project Goals

The main goals of Stock Manager were to:

Build a practical inventory management system.
Centralize products, purchases, sales and expenses.
Provide useful business performance information.
Reduce manual record keeping.
Practice full-stack web development.
Gain practical experience with databases and APIs.
Learn how to deploy and maintain a real-world application.
🌐 Live Application

Try Stock Manager:

👉 https://kinghuncho.github.io/stock-manager/
👨‍💻 Developer
John Muli Mwanzia

Junior Web Developer • Web Designer • Digital Operations

I designed and developed Stock Manager as a hands-on full-stack development project.

Links
🌐 Portfolio: https://kinghuncho.github.io/portfolio/
💻 GitHub: https://github.com/Kinghuncho
📦 Stock Manager: https://github.com/Kinghuncho/stock-manager
🚀 Live Demo: https://kinghuncho.github.io/stock-manager/
📄 License

This project was created as a personal development and portfolio project.
