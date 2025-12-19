// --- File: ai-classifier-worker.js ---
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai'; // Assuming you will use a Google AI model

// 1. Initialize Prisma and AI Clients
const prisma = new PrismaClient({
  errorFormat: 'pretty',
});
// Ensure GEMINI_API_KEY is available in the worker's environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 

// 2. Define the core AI classification logic
async function classifyContact(contactId) {
    // SECURITY NOTE: We are running this on the worker side, where
    // RLS is not automatically applied, but we will fetch the data
    // based on the contact ID, which should ensure data integrity.

    // Fetch the contact and the associated organization/brand data
    const contact = await prisma.contact.findUnique({
        where: { contact_id: contactId },
        include: {
            brand: {
                include: {
                    organization: true
                }
            }
        }
    });

    if (!contact) {
        console.warn(`Contact ID ${contactId} not found.`);
        return;
    }

    const { organization, brand } = contact.brand;

    // --- 3. Prompt Engineering for Classification ---
    // This is the System Prompt that sets the AI's role and rules
    const prompt = `
        You are an expert B2B lead classifier for a SaaS platform.
        The contact is for organization: ${organization.org_name} (Brand: ${brand.brand_name}).
        The contact's status is: ${contact.contact_status}.
        
        Analyze the following text from the contact's profile: "${contact.first_name}" (Replace with a rich text field later).
        
        Classify the contact into one of these categories and return ONLY the JSON object:
        {
          "industry": "High-Tech, Manufacturing, or Services",
          "intent_score": "1-5", // 5 being highest intent
          "next_action": "Email, Call, or Discard"
        }
    `;
    
    try {
        const result = await ai.generateContent({
            model: "gemini-2.5-flash", // Use the appropriate model
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const classification = JSON.parse(result.text.trim());
        
        // 4. Update the contact record in the database
        await prisma.contact.update({
            where: { contact_id: contactId },
            data: {
                // Assuming you add these fields to the 'contacts' table later
                industry: classification.industry,
                intent_score: classification.intent_score,
                last_classification: new Date(),
            }
        });

        console.log(`Successfully classified contact ${contactId}: ${classification.next_action}`);

    } catch (error) {
        console.error(`AI classification failed for ${contactId}:`, error);
    }
}


// --- 5. Main Worker Loop (Pulls tasks from a Queue/Table) ---
async function main() {
    console.log('AI Classifier Worker running...');
    
    // NOTE: In a production app, this would poll a dedicated 'tasks' table 
    // or listen to a message queue (like Redis or Kafka).
    while (true) {
        try {
            // Placeholder: find contacts needing classification (where 'intent_score' is null)
            const contactsToProcess = await prisma.contact.findMany({
                where: {
                    intent_score: null, // Only process unclassified contacts
                },
                take: 10 // Process in batches
            });

            if (contactsToProcess.length > 0) {
                console.log(`Found ${contactsToProcess.length} contacts to classify.`);
                for (const contact of contactsToProcess) {
                    await classifyContact(contact.contact_id);
                }
            } else {
                // Wait before checking the queue again
                await new Promise(resolve => setTimeout(resolve, 5000)); 
            }

        } catch (error) {
            console.error('Main worker loop error:', error);
            // Wait longer on error
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});