# ShopEase - Full-Stack E-Commerce Website

## Internship Project
A practical e-commerce website built with HTML, CSS, JavaScript, Node.js, Express and SQLite.

## Features
- Responsive interface
- Product listing
- Search and category filter
- Shopping cart using localStorage
- Checkout form with validation
- SQLite database integration
- Product CRUD (Create, Read, Update, Delete)
- Order creation and stock update
- Basic order API

## Requirements
- Node.js 20+ (Node.js 22 LTS recommended)
- npm

## Run
```bash
npm install
npm start
```
Open: http://localhost:3000

Admin CRUD:
http://localhost:3000/admin.html

## API
GET /api/products
GET /api/products?q=shoe
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
POST /api/orders
GET /api/orders

## Project Structure
server.js - Express server and SQLite database
public/index.html - Store UI
public/style.css - Responsive styling
public/script.js - Store/cart/checkout logic
public/admin.html - CRUD admin page
ecommerce.db - Created automatically after first run

## Testing Checklist
1. Open homepage.
2. Search for a product.
3. Filter by category.
4. Add products to cart.
5. Change quantity/remove item.
6. Submit checkout with valid details.
7. Verify order response and stock update.
8. Open Admin CRUD page.
9. Create, edit and delete a product.
10. Refresh and verify database persistence.
