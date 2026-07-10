# Quote Test Results
**Date:** 2026-07-04  
**Environment:** Dev (local) — API on port 8080, DB: crmai (PostgreSQL 18)

---

## Normal Quotes

### Test 1 — Empty Quote (no line items)
**POST /api/quotes**
```json
{ "name": "Normal Quote Empty", "status": "draft", "discount": 0, "tax": 0, "items": [] }
```
**Result:** ✅ PASS
```
id: 29 | quoteNumber: QT-1004 | total: 0
```

---

### Test 2 — Quote with Manual Line Items + Discount + Tax
**POST /api/quotes**
```json
{
  "name": "Normal Quote With Items",
  "status": "draft",
  "discount": 5,
  "tax": 8,
  "items": [
    { "productId": 1, "productName": "CRM Pro License",   "quantity": 3, "unitPrice": 1200, "discount": 10 },
    { "productId": null, "productName": "Custom Service", "quantity": 1, "unitPrice": 500,  "discount": 0  }
  ]
}
```
**Result:** ✅ PASS
```
id: 30 | quoteNumber: QT-1005 | subtotal: 3740 | total: 3837.24
```
- subtotal = (3 × 1200 × 0.90) + (1 × 500) = 3240 + 500 = 3740
- after 5% quote discount → 3553, then 8% tax → 3837.24 ✓

---

### Test 3 — Update (PUT) Normal Quote
**PUT /api/quotes/30**
```json
{
  "name": "Normal Quote Updated",
  "status": "sent",
  "discount": 10,
  "tax": 8,
  "items": [
    { "productId": 1, "productName": "CRM Pro License", "quantity": 5, "unitPrice": 1200, "discount": 15 },
    { "productId": null, "productName": "Support Plan",  "quantity": 1, "unitPrice": 800,  "discount": 0  }
  ]
}
```
**Result:** ✅ PASS
```
quoteNumber: QT-1005 | name: Normal Quote Updated | status: sent
subtotal: 5900 | total: 5734.80
```

---

## Bundle Quotes

### Test 4 — Bundle Quote (Starter Pack: 2 products)
**POST /api/quotes**
```json
{
  "name": "Bundle Quote - Starter Pack",
  "status": "draft",
  "discount": 0,
  "tax": 0,
  "items": [
    { "productId": 1, "productName": "CRM Pro License",          "quantity": 2, "unitPrice": 1200, "discount": 14.99 },
    { "productId": 4, "productName": "Custom Integration Package","quantity": 1, "unitPrice": 8000, "discount": 10   }
  ]
}
```
**Result:** ✅ PASS
```
id: 31 | quoteNumber: QT-1006 | subtotal: 9240.24 | total: 9240.24
```
- Discount 14.99% applied per item from bundle (item disc 5% + bundle disc 10%)
- Items verified present on GET /api/quotes/31 ✓

---

### Test 5 — Mixed Quote (Bundle items + Manual item)
**POST /api/quotes**
```json
{
  "name": "Mixed Quote",
  "status": "draft",
  "discount": 5,
  "tax": 10,
  "items": [
    { "productId": 1, "productName": "CRM Pro License",          "quantity": 2, "unitPrice": 1200, "discount": 14.99 },
    { "productId": 4, "productName": "Custom Integration Package","quantity": 1, "unitPrice": 8000, "discount": 10   },
    { "productId": null, "productName": "Extra Consulting",       "quantity": 5, "unitPrice": 200,  "discount": 0   }
  ]
}
```
**Result:** ✅ PASS
```
id: 32 | quoteNumber: QT-1007 | subtotal: 10240.24 | total: 10701.05
```

---

### Test 6 — Update (PUT) Bundle Quote (with priceBookEntryId — quote-detail.tsx format)
**PUT /api/quotes/31**
```json
{
  "name": "Bundle Quote - Final",
  "status": "draft",
  "discount": 0,
  "tax": 5,
  "priceBookId": 1,
  "items": [
    { "productId": 1, "priceBookEntryId": null, "productName": "CRM Pro License",          "quantity": 2, "unitPrice": 1200, "discount": 14.99 },
    { "productId": 4, "priceBookEntryId": null, "productName": "Custom Integration Package","quantity": 1, "unitPrice": 8000, "discount": 10   }
  ]
}
```
**Result:** ✅ PASS
```
quoteNumber: QT-1006 | name: Bundle Quote - Final
subtotal: 9240.24 | total: 9702.25
Items on GET:
  - CRM Pro License x2 @ 1200 disc=14.99%
  - Custom Integration Package x1 @ 8000 disc=10%
```

---

## Quote Number Sequence
| Quote | Number   |
|-------|----------|
| 29    | QT-1004  |
| 30    | QT-1005  |
| 31    | QT-1006  |
| 32    | QT-1007  |

✅ Sequential, no duplicates, no NaN.

---

## Bugs Fixed (this session)
| Bug | Fix |
|-----|-----|
| `created_by_user_id = 0` → FK violation → 500 error | Return `null` if uid ≤ 0 (dev user has no DB row) |
| `QT-NaN` quote numbers (old `QUO-` prefix confusing parser) | Use `REGEXP_REPLACE` + numeric cast with `~ '^QT-[0-9]+$'` filter |
| `QT-NaN` > `QT-1001` alphabetically → duplicate key | Deleted stale `QT-NaN` row; fixed all 3 MAX queries in quotes.ts |
| Bundle picker missing from Quotes list dialog | Added full bundle picker + `addBundle` to `QuoteFormDialog` in quotes.tsx |
