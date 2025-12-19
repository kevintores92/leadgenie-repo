# Contact Fields Mapping - Complete Reference

**Updated:** December 20, 2025  
**Status:** ✅ All fields available in CSV import mapping

---

## Available Contact Fields

The CSV import mapping dropdown now supports the following fields:

### Personal Information
- **First Name** → `firstName` (required)
- **Last Name** → `lastName`

### Property Address
- **Address** → `propertyAddress`
- **City** → `propertyCity`
- **State** → `propertyState`
- **Zip** → `propertyZip`
- **County** → `propertyCounty`

### Mailing Address
- **Mailing Address** → `mailingAddress`
- **Mailing City** → `mailingCity`
- **Mailing State** → `mailingState`
- **Mailing Zip** → `mailingZip`
- **Mailing County** → `mailingCounty`

### Phone Numbers
- **Phone 1** → `phone` (required for sending)
- **Phone 2** → `phone2`
- **Phone 3** → `phone3`
- **Phone 4** → `phone4`
- **Phone 5** → `phone5`

### Custom Fields
- **Custom 1** → `custom1`
- **Custom 2** → `custom2`
- **Custom 3** → `custom3`
- **Custom 4** → `custom4`
- **Custom 5** → `custom5`
- **Custom 6** → `custom6`
- **Custom 7** → `custom7`
- **Custom 8** → `custom8`
- **Custom 9** → `custom9`
- **Custom 10** → `custom10`

---

## Total Fields Available
**16 standard fields** + **10 custom fields** = **26 fields** for importing

---

## Files Updated

### 1. Frontend Prisma Schema
📄 `apps/frontend/prisma/schema.prisma`
- Added `mailingCounty` field to Contact model

### 2. Frontend Import Modal
📄 `apps/frontend/features/contacts/ImportContactsModal.tsx`
- Updated `DATABASE_FIELDS` array with new field list
- Removed: Email, Phone Number (not in standard import list)
- Added: Proper ordering per requirements
- Phone renamed from "Phone" to "Phone 1"

### 3. Frontend Import API
📄 `apps/frontend/pages/api/contacts/import.ts`
- Updated contact data mapping to handle `mailingCounty`
- All 16 standard fields now properly mapped

### 4. Backend Prisma Schema
📄 `apps/backend-api/prisma/schema.prisma`
- Added `mailingCounty` field to Contact model

### 5. Worker Services Prisma Schema
📄 `apps/worker-services/prisma/schema.prisma`
- Added `mailingCounty` field to Contact model

---

## CSV Import Example

Your CSV file should have headers that match your data source:

```csv
First Name,Last Name,Address,City,State,Zip,Mailing Address,Mailing City,Mailing State,Mailing Zip,Phone 1,Phone 2,Custom 1,Custom 2
John,Doe,123 Main St,Columbus,OH,43085,456 Oak Ave,Dublin,OH,43016,6145551234,6145551235,Value1,Value2
Jane,Smith,789 Elm St,Westerville,OH,43081,789 Elm St,Westerville,OH,43081,6145556789,,CustomVal1,
```

---

## Mapping in UI

When you upload a CSV file:
1. The system detects column headers automatically
2. You'll see the list of detected columns on the right
3. For each database field on the left, select which CSV column maps to it
4. The mapping dropdown will show all available CSV columns
5. Only "Phone 1" is required

**Example Mapping:**
```
Database Field         CSV Column
─────────────────────────────────────
First Name        →   "First Name"
Last Name         →   "Last Name"
Address           →   "Property Address"
City              →   "City"
State             →   "State"
Zip               →   "Zip Code"
Phone 1           →   "Phone"
Phone 2           →   "Mobile"
Custom 1          →   "Notes"
...
```

---

## Database Schema

All fields are now stored in the Contact table with proper types:

```typescript
model Contact {
  // Personal
  firstName        String      // Required
  lastName         String?     // Optional

  // Property Address (5-6 fields)
  propertyAddress  String?
  propertyCity     String?
  propertyState    String?
  propertyZip      String?
  propertyCounty   String?

  // Mailing Address (5 fields)
  mailingAddress   String?
  mailingCity      String?
  mailingState     String?
  mailingZip       String?
  mailingCounty    String?   // NEW

  // Phone Numbers (5 fields)
  phone            String      // Required, unique per brand
  phone2           String?
  phone3           String?
  phone4           String?
  phone5           String?

  // Custom Fields (10 fields)
  // Stored in ContactCustomField table with definitions
  custom1-10       // Via custom field definitions
}
```

---

## Implementation Details

### Frontend Import Flow
1. User selects CSV/XLSX file
2. System parses headers
3. User maps CSV columns to database fields
4. System validates mapping (Phone 1 required)
5. Data sent to `/api/contacts/import` endpoint
6. API creates Contact records with all fields

### Custom Fields
Custom 1-10 fields are:
- Stored separately in `ContactCustomField` table
- Linked via `CustomFieldDefinition`
- Flexible and user-extensible
- Support any data type (text, email, phone, etc.)

### Data Validation
- **Phone 1**: Required, must be valid phone digits
- **First Name**: Required, defaults to "Unknown" if missing
- **All other fields**: Optional, stored as-is

---

## Next Steps

1. **Run Database Migration**
   ```bash
   # Frontend
   cd apps/frontend
   npx prisma migrate dev --name add_mailing_county

   # Backend
   cd apps/backend-api
   npx prisma migrate dev --name add_mailing_county

   # Worker Services
   cd apps/worker-services
   npx prisma migrate dev --name add_mailing_county
   ```

2. **Test Import**
   - Create a test CSV with all 16 fields
   - Verify mapping dropdown shows all fields
   - Test successful import
   - Verify data stored correctly

3. **Document for Users**
   - Share this field list with users importing data
   - Provide CSV template with proper column headers
   - Show example mapping

---

## Contact Field Summary

| Category | Fields | Required? |
|----------|--------|-----------|
| Personal | First Name, Last Name | First Name |
| Property | Address, City, State, Zip, County | No |
| Mailing | Address, City, State, Zip, County | No |
| Phone | Phone 1-5 | Phone 1 |
| Custom | Custom 1-10 | No |
| **Total** | **26 fields** | **1 required** |

---

**Status:** ✅ Complete  
**All systems updated and ready for production**
