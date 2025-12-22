import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { Upload, FileUp, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as api from "@/lib/api";
import { validatePhoneList } from "@/lib/phoneValidation";

const csvFields = [
  "propertyAddress",
  "Unit #",
  "City",
  "State",
  "Zip",
  "County",
  "APN",
  "Owner Occupation",
  "Owner 1 First Name",
  "Owner 1 Last Name",
  "Owner 2 First Name",
  "Owner 2 Last Name"
];

const contactFields = [
  "-- Don't Import --",
  "name",
  "email",
  "phone",
  "company",
  "address",
  "city",
  "state",
  "zip",
  "notes"
];

export default function UploadList() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [showMapping, setShowMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationProgress, setValidationProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploadedFile(file);
      setShowMapping(true);
      // Initialize mappings
      const newMappings: Record<string, string> = {};
      csvFields.forEach(field => {
        newMappings[field] = "-- Don't Import --";
      });
      setMappings(newMappings);
    }
  };

  const handleMappingChange = (csvField: string, contactField: string) => {
    setMappings(prev => ({ ...prev, [csvField]: contactField }));
  };

  const handleContinue = async () => {
    if (!uploadedFile) return;
    
    setError("");
    setUploading(true);
    setShowMapping(false);
    
    try {
      // Step 1: Upload file to backend
      const uploadResult = await api.uploadContacts(uploadedFile);
      
      // Step 2: Extract phone numbers from uploaded data
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const phoneNumbers: string[] = [];
          
          // Extract phone numbers from CSV (assuming phone column exists)
          for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(',');
            // Find phone number columns (adjust based on your CSV structure)
            const phoneMatch = columns.join(',').match(/(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})/g);
            if (phoneMatch) {
              phoneNumbers.push(...phoneMatch);
            }
          }
          
          if (phoneNumbers.length === 0) {
            throw new Error("No phone numbers found in CSV");
          }
          
          // Step 3: Validate phone numbers
          setValidating(true);
          const validationResult = await validatePhoneList(phoneNumbers);
          
          // Step 4: Save validated list
          const savedList = await api.saveValidatedList({
            fileName: fileName,
            totalRows: validationResult.totalRows,
            verifiedMobile: validationResult.verifiedMobile,
            verifiedLandline: validationResult.verifiedLandline,
            validatedData: validationResult.results
          });
          
          // Step 5: Navigate to campaign page with list ID
          navigate(`/campaign/new?listId=${savedList.id}`);
          
        } catch (err: any) {
          setError(err.message || "Failed to process contacts");
          setShowMapping(true);
          setUploading(false);
          setValidating(false);
        }
      };
      
      reader.readAsText(uploadedFile);
      
    } catch (err: any) {
      setError(err.message || "Failed to upload contacts");
      setShowMapping(true);
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <FileUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Upload Contact List</h1>
              <p className="text-muted-foreground">Upload your CSV file and map columns to contact fields</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="glass-card rounded-lg border border-red-500/50 bg-red-500/10 p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Upload Area */}
          {!uploadedFile ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-colors p-12"
            >
              <label htmlFor="csv-upload" className="cursor-pointer block text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Drop your CSV file here</h3>
                <p className="text-muted-foreground mb-4">or click to browse</p>
                <input
                  id="csv-upload"
                  data-testid="input-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <Button
                  type="button"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  onClick={() => document.getElementById("csv-upload")?.click()}
                >
                  Select CSV File
                </Button>
              </label>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl p-8 border border-primary/30"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{fileName}</p>
                  <p className="text-sm text-muted-foreground">Ready for mapping</p>
                </div>
              </div>
              <Button
                data-testid="button-edit-mapping"
                onClick={() => setShowMapping(true)}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                Edit Mapping
              </Button>
            </motion.div>
          )}

          {/* Mapping Modal */}
          <Dialog open={showMapping} onOpenChange={setShowMapping}>
            <DialogContent className="glass-card border-white/10 max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Map CSV Columns to Contact Fields</DialogTitle>
                <DialogDescription>
                  Select which contact field each CSV column should map to. A new group will be created automatically.
                </DialogDescription>
              </DialogHeader>

              {/* Vertical Mapping List */}
              <div className="space-y-4 py-6">
                {csvFields.map(csvField => (
                  <motion.div
                    key={csvField}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-white/5 rounded-lg p-4 bg-white/[0.02]"
                  >
                    <Label className="text-sm font-medium block mb-3">{csvField}</Label>
                    <Select
                      value={mappings[csvField] || "-- Don't Import --"}
                      onValueChange={(value) => handleMappingChange(csvField, value)}
                    >
                      <SelectTrigger className="glass-card border-white/10 focus:border-primary bg-white/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10">
                        {contactFields.map(field => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                <Button
                  data-testid="button-cancel-mapping"
                  type="button"
                  variant="outline"
                  onClick={() => setShowMapping(false)}
                  className="flex-1 border-white/10 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  data-testid="button-confirm-mapping"
                  onClick={handleContinue}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </AppLayout>
  );
}
