# Pbazar Partner System Connection Prompt

Use these instructions when configuring or building a separate **Seller App** that needs to connect to the Pbazar platform database.

## 1. Database Connection (Firestore)
- **Project Database ID**: `ai-studio-478d8860-d347-4002-b696-209c0bb25c2e`
- **Primary Collections**:
  - `products`: Main catalog. Sellers MUST include `seller_id` (username) and `seller` (display name) in every document.
  - `sellers_auth`: Secure seller credentials and profile data. Keyed by `username`.
  - `sellers`: Publicly visible seller listings for the main storefront.
  - `reviews`: Product reviews linked via `product_id`.

## 2. Shared Data Schema (Products)
When adding a product, the following fields are MANDATORY for proper integration:
```json
{
  "name": "Product Name",
  "price": 5000,
  "category": "Electronics",
  "seller": "Store Display Name",
  "seller_id": "unique_username",
  "seller_whatsapp": "017...",
  "seller_logo": "https://...",
  "stock": 20,
  "created_at": "ISO-TIMESTAMP"
}
```

## 3. Security & Ownership
- **Sellers** should only be able to `update` or `edit` products where the `seller_id` matches their own username.
- **Admins** have full `delete` permissions. Sellers are restricted from permanent deletion to maintain audit logs; they should instead set `stock` to `0`.

## 4. Server Integration
The platform uses a custom Express server running on port 3000. All partner apps should check the `/api/health` endpoint to verify connectivity to the central Pbazar ordering logic.
