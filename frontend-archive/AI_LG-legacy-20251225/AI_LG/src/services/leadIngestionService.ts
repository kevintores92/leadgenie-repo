import { PrismaClient } from '@prisma/client';
import { validatePhoneList } from '../utils/phoneValidation';

const prisma = new PrismaClient();

export class LeadIngestionService {
  /**
   * Process uploaded CSV file and validate leads
   */
  static async processLeadFile(
    organizationId: string,
    fileBuffer: Buffer,
    filename: string,
    fieldMappings: Record<string, string>
  ) {
    try {
      // Parse CSV content
      const csvContent = fileBuffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1);

      // Validate field mappings
      const requiredMappings = this.validateFieldMappings(fieldMappings, headers);

      // Process each row
      const processedLeads: any[] = [];
      const phoneNumbers: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;

        const columns = this.parseCsvRow(row);
          const lead = this.mapLeadFromCsv(columns, headers, requiredMappings);

          const primaryPhone = lead.phone1 || lead.phone || null;
          if (primaryPhone) {
            phoneNumbers.push(primaryPhone);
            processedLeads.push({
              ...lead,
              primaryPhone,
              rowIndex: i + 2, // 1-based row number including header
            });
          }
      }

      // Validate phone numbers in bulk
      const validationResults = await validatePhoneList(phoneNumbers);

      // Create validated list record
      const validatedList = await prisma.validatedList.create({
        data: {
          organizationId,
          fileName: filename,
          totalRows: processedLeads.length,
          verifiedMobile: validationResults.filter(r => r.phoneType === 'mobile' && r.isValid).length,
          verifiedLandline: validationResults.filter(r => r.phoneType === 'landline' && r.isValid).length,
          validatedData: JSON.stringify({
            leads: processedLeads,
            validationResults,
            fieldMappings: requiredMappings,
          }),
        },
      });

      // Log consent for TCPA compliance
      await this.logBulkConsent(organizationId, processedLeads, validationResults);

      return {
        listId: validatedList.id,
        totalRows: processedLeads.length,
        verifiedMobile: validatedList.verifiedMobile,
        verifiedLandline: validatedList.verifiedLandline,
        invalidPhones: validationResults.filter(r => !r.isValid).length,
        fieldMappings: requiredMappings,
      };
    } catch (error) {
      console.error('Lead ingestion error:', error);
      throw error;
    }
  }

  /**
   * Validate field mappings against CSV headers
   */
  private static validateFieldMappings(
    mappings: Record<string, string>,
    headers: string[]
  ): Record<string, string> {
    const validMappings: Record<string, string> = {};

    // Allowed contact fields (no mailing_* fields)
    const contactFields = ['name', 'email', 'phone1', 'phone2', 'phone3', 'company', 'address', 'city', 'state', 'zip', 'notes'];

    const usedFields: string[] = [];
    for (const [csvField, contactField] of Object.entries(mappings)) {
      if (!headers.includes(csvField)) {
        throw new Error(`Mapped CSV field '${csvField}' not found in file headers`);
      }

      if (contactField !== "-- Don't Import --") {
        if (!contactFields.includes(contactField)) {
          throw new Error(`Invalid contact field mapping: ${contactField}`);
        }
        // Enforce that a contact field is only used once
        if (usedFields.includes(contactField)) {
          throw new Error(`Contact field '${contactField}' is mapped more than once`);
        }
        usedFields.push(contactField);
      }

      validMappings[csvField] = contactField;
    }

    // Ensure phone1 field is mapped (only phone1 is required)
    const hasPhone1 = Object.values(validMappings).includes('phone1');
    if (!hasPhone1) {
      throw new Error('Phone 1 field must be mapped for lead ingestion');
    }

    return validMappings;
  }

  /**
   * Parse CSV row handling quoted fields
   */
  private static parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  }

  /**
   * Map CSV row to lead object
   */
  private static mapLeadFromCsv(
    columns: string[],
    headers: string[],
    mappings: Record<string, string>
  ): any {
    const lead: any = {};

    headers.forEach((header, index) => {
      const contactField = mappings[header];
      if (contactField && contactField !== '-- Don\'t Import --') {
        let value = columns[index] || '';

        // Clean up quoted values
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"');
        }

        // Special handling for name fields
        if (contactField === 'name' && !lead.name) {
          // Try to construct full name from first/last if available
          const firstName = lead.firstName || '';
          const lastName = lead.lastName || '';
          if (firstName || lastName) {
            lead.name = `${firstName} ${lastName}`.trim();
          } else {
            lead.name = value;
          }
        } else if (contactField === 'firstName' || contactField === 'lastName') {
          lead[contactField] = value;
          // Also set name if not set
          if (!lead.name) {
            const first = contactField === 'firstName' ? value : lead.firstName || '';
            const last = contactField === 'lastName' ? value : lead.lastName || '';
            if (first || last) {
              lead.name = `${first} ${last}`.trim();
            }
          }
        } else {
          lead[contactField] = value;
        }
      }
    });

    return lead;
  }

  /**
   * Log consent for bulk lead import
   */
  private static async logBulkConsent(
    organizationId: string,
    leads: any[],
    validationResults: any[]
  ) {
    const consentPromises = leads.map(async (lead, index) => {
      const validation = validationResults[index];
      if (validation?.isValid) {
        // Log consent for TCPA compliance
        await prisma.consentLedger.create({
          data: {
            leadId: `temp_${lead.rowIndex}`, // Will be updated when contacts are created
            organizationId,
            consentType: 'bulk_import_tcpa',
            source: 'csv_upload',
            timestamp: new Date(),
            proofReference: `File upload consent - Row ${lead.rowIndex}`,
          },
        });
      }
    });

    await Promise.all(consentPromises);
  }

  /**
   * Get validated list data
   */
  static async getValidatedList(listId: number) {
    try {
      const list = await prisma.validatedList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        throw new Error('Validated list not found');
      }

      const data = JSON.parse(list.validatedData);

      return {
        id: list.id,
        fileName: list.fileName,
        totalRows: list.totalRows,
        verifiedMobile: list.verifiedMobile,
        verifiedLandline: list.verifiedLandline,
        leads: data.leads,
        validationResults: data.validationResults,
        fieldMappings: data.fieldMappings,
      };
    } catch (error) {
      console.error('Failed to get validated list:', error);
      throw error;
    }
  }

  /**
   * Create contacts from validated list
   */
  static async createContactsFromList(
    organizationId: string,
    brandId: string,
    listId: number,
    userId?: string
  ) {
    try {
      const listData = await this.getValidatedList(listId);
      const contacts = [];

      for (let i = 0; i < listData.leads.length; i++) {
        const lead = listData.leads[i];
        const validation = listData.validationResults[i];

        if (validation?.isValid) {
          const contact = await prisma.contact.create({
            data: {
              organizationId,
              brandId,
              firstName: lead.firstName || lead.name?.split(' ')[0] || '',
              lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || '',
              phone: lead.phone,
              lineType: validation.lineType,
              phoneType: validation.phoneType,
              carrier: validation.carrier,
              country: validation.country,
              isPhoneValid: validation.isValid,
              propertyAddress: lead.address,
              propertyCity: lead.city,
              propertyState: lead.state,
              propertyZip: lead.zip,
              mailingAddress: lead.address,
              mailingCity: lead.city,
              mailingState: lead.state,
              mailingZip: lead.zip,
              tags: ['imported'],
            },
          });

          contacts.push(contact);

          // Update consent ledger with actual contact ID
          await prisma.consentLedger.updateMany({
            where: {
              leadId: `temp_${lead.rowIndex}`,
              organizationId,
            },
            data: {
              leadId: contact.id,
            },
          });
        }
      }

      return {
        totalImported: contacts.length,
        contacts,
      };
    } catch (error) {
      console.error('Failed to create contacts from list:', error);
      throw error;
    }
  }
}