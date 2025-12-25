# CSV Import Mapping - Dropdown Reference

**Status:** ✅ Updated  
**Date:** December 20, 2025

---

## What Users Will See in the Import Modal

When users upload a CSV file for importing contacts, the mapping dropdown will now show these fields in this exact order:

```
Database Field to Map (Left Side) | Available Options in Dropdown (Right Side)
─────────────────────────────────────────────────────────────────────────────

First Name                         ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Last Name                          ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Address                            ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

City                               ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

State                              ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Zip                                ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Mailing Address                    ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Mailing City                       ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Mailing State                      ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Mailing Zip                        ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Phone 1                            ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]  ← REQUIRED
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Phone 2                            ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Phone 3                            ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Phone 4                            ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Phone 5                            ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 1                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 2                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 3                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 4                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 5                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 6                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 7                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 8                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 9                           ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc

Custom 10                          ┌─ -- Don't Import --
                                   ├─ [Column 1 from CSV]
                                   ├─ [Column 2 from CSV]
                                   └─ ... etc
```

---

## Example Mapping Scenario

**Your CSV file has these columns:**
```
First Name, Last Name, Email, Street Address, City, State, ZIP Code, Mobile, Home Phone, Notes
```

**You would map them like this:**
```
Field in Database    │ Field in Your CSV
─────────────────────┼──────────────────
First Name           → First Name
Last Name            → Last Name
Address              → Street Address
City                 → City
State                → State
Zip                  → ZIP Code
Phone 1              → Mobile           ← Required
Phone 2              → Home Phone
Custom 1             → Notes
(Leave others blank) → -- Don't Import --
```

---

## Field List (Exact Order in Dropdown)

1. First Name
2. Last Name
3. Address
4. City
5. State
6. Zip
7. Mailing Address
8. Mailing City
9. Mailing State
10. Mailing Zip
11. Phone 1
12. Phone 2
13. Phone 3
14. Phone 4
15. Phone 5
16. Custom 1
17. Custom 2
18. Custom 3
19. Custom 4
20. Custom 5
21. Custom 6
22. Custom 7
23. Custom 8
24. Custom 9
25. Custom 10

**Total: 25 fields** (Phone 1 is required, others optional)

---

## What Gets Stored in Database

Each field maps to a column in the Contact table:

| User-Friendly Name | Database Column | Type | Required | Notes |
|-------------------|-----------------|------|----------|-------|
| First Name | firstName | Text | ✅ Yes | Must be mapped |
| Last Name | lastName | Text | ❌ No | Optional |
| Address | propertyAddress | Text | ❌ No | Property location |
| City | propertyCity | Text | ❌ No | Property city |
| State | propertyState | Text | ❌ No | Property state |
| Zip | propertyZip | Text | ❌ No | Property zip code |
| Mailing Address | mailingAddress | Text | ❌ No | Separate mailing addr |
| Mailing City | mailingCity | Text | ❌ No | Mailing city |
| Mailing State | mailingState | Text | ❌ No | Mailing state |
| Mailing Zip | mailingZip | Text | ❌ No | Mailing zip code |
| Phone 1 | phone | Phone | ✅ Yes | Must map a phone |
| Phone 2 | phone2 | Phone | ❌ No | Additional phone |
| Phone 3 | phone3 | Phone | ❌ No | Additional phone |
| Phone 4 | phone4 | Phone | ❌ No | Additional phone |
| Phone 5 | phone5 | Phone | ❌ No | Additional phone |
| Custom 1-10 | custom1-10 | Text | ❌ No | User-defined fields |

---

## Import Validation

✅ **What will pass:**
- CSV file uploaded
- At least one column mapped to "Phone 1"
- Valid phone number format (digits only, or with common separators)

❌ **What will fail:**
- No "Phone 1" mapping
- Invalid phone numbers (all letters, no digits)
- Empty file
- Unsupported file format (not CSV or XLSX)

---

## Notes for Users

- **Phone 1 is required** - Every contact needs at least one phone number
- **Flexible mapping** - You can skip any optional fields
- **Duplicates prevented** - If phone already exists for this brand, contact is skipped
- **Custom fields** - Custom 1-10 are flexible and can be used for any extra data
- **Property vs Mailing** - Use "Address" for property location, "Mailing Address" for where to send mail
- **Preview shown** - Before importing, you'll see a preview of first few rows

---

## Files Modified

1. ✅ `apps/frontend/features/contacts/ImportContactsModal.tsx`
   - Updated DATABASE_FIELDS array
   
2. ✅ `apps/frontend/pages/api/contacts/import.ts`
   - Updated contact data mapping

3. ✅ `apps/frontend/prisma/schema.prisma`
   - Added mailingCounty field

4. ✅ `apps/backend-api/prisma/schema.prisma`
   - Added mailingCounty field

5. ✅ `apps/worker-services/prisma/schema.prisma`
   - Added mailingCounty field

---

## Testing the Update

### Step 1: Run Database Migration
```bash
npx prisma migrate dev --name add_contact_fields
```

### Step 2: Test CSV Import
1. Go to Contacts page
2. Click "Import Contacts"
3. Upload a test CSV with columns matching the field names
4. Verify dropdown shows all 25 fields
5. Map fields appropriately
6. Click "Save Mapping"
7. Verify contacts imported with all fields populated

### Step 3: Verify in Database
```bash
SELECT firstName, lastName, propertyAddress, mailingAddress, phone, custom1, custom2 
FROM "Contact" 
WHERE brandId = 'YOUR_BRAND_ID' 
LIMIT 5;
```

---

## Support Reference

If users ask about available fields, reference this list:

**Standard Fields (16):**
- First Name, Last Name
- Address, City, State, Zip
- Mailing Address, Mailing City, Mailing State, Mailing Zip
- Phone 1, Phone 2, Phone 3, Phone 4, Phone 5

**Custom Fields (10):**
- Custom 1, Custom 2, Custom 3, Custom 4, Custom 5
- Custom 6, Custom 7, Custom 8, Custom 9, Custom 10

**Total: 26 fields**

---

**Status:** ✅ Ready for Use  
All fields are now available in the CSV import dropdown.
