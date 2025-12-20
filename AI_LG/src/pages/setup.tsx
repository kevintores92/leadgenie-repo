import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PageShell } from "@/components/app/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function getStepFromWindow(): 1 | 2 {
  try {
    const stepRaw = new URLSearchParams(window.location.search).get("step");
    return stepRaw === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

export default function SetupPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Wouter's `location` may not include the querystring depending on router setup.
  // Read the `step` from `window.location.search` and re-evaluate when location changes.
  const step = useMemo(() => getStepFromWindow(), [location]);

  const [loading, setLoading] = useState(false);

  // Step 1
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [einOrRegistrationNumber, setEinOrRegistrationNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCountry, setBusinessCountry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessContactName, setBusinessContactName] = useState("");
  const [businessContactEmail, setBusinessContactEmail] = useState("");
  const [businessContactPhone, setBusinessContactPhone] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  // Step 2
  const [mappingOpen, setMappingOpen] = useState(false);
  const [processingStage, setProcessingStage] = useState<
    "idle" | "mapping" | "verifying" | "splitting" | "done"
  >("idle");

  useEffect(() => {
    // If user hits /setup directly without a `step`, ensure step=1.
    try {
      const hasStep = new URLSearchParams(window.location.search).has("step");
      if (window.location.pathname === "/setup" && !hasStep) {
        setLocation("/setup?step=1");
      }
    } catch {
      if (location === "/setup") setLocation("/setup?step=1");
    }
  }, [location, setLocation]);

  const goStep1 = () => setLocation("/setup?step=1");
  const goStep2 = () => setLocation("/setup?step=2");

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessType) {
      toast({
        title: "Missing info",
        description: "Business type is required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Placeholder: backend will register 10DLC brand/campaign.
      localStorage.setItem(
        "ai_leadgenie_business",
        JSON.stringify({
          legalBusinessName,
          dbaName,
          businessType,
          einOrRegistrationNumber,
          businessAddress,
          businessCountry,
          websiteUrl,
          businessContactName,
          businessContactEmail,
          businessContactPhone,
          businessDescription,
        })
      );
      toast({
        title: "Saved",
        description: "10DLC info captured. Next: upload your list.",
      });
      goStep2();
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file?: File | null) => {
    if (!file) return;

    setProcessingStage("mapping");
    setMappingOpen(true);
  };

  const completeMapping = async () => {
    setMappingOpen(false);
    setProcessingStage("verifying");

    // Keep it fast + simple: staged progress to mimic backend automation.
    await new Promise((r) => setTimeout(r, 600));
    setProcessingStage("splitting");
    await new Promise((r) => setTimeout(r, 600));
    setProcessingStage("done");

    // Minimal derived result for campaigns page.
    localStorage.setItem(
      "ai_leadgenie_list_result",
      JSON.stringify({
        verified: true,
        mobileCount: 100,
        landlineCount: 57,
        createdGroups: ["Contacts - Mobile", "Contacts - Landline"],
      })
    );

    toast({
      title: "Done",
      description:
        "List verified and split into Mobile + Landline groups. Ready to start a campaign.",
    });

    setLocation("/campaigns");
  };

  return (
    <PageShell>
      <div className="relative overflow-hidden">
        {/* Step 1 (base) */}
        <div
          className={
            "transition-transform duration-500 " +
            (step === 2 ? "-translate-x-full" : "translate-x-0")
          }
        >
          <div className="mx-auto max-w-2xl">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Step 1 — 10DLC business info</CardTitle>
                <CardDescription>
                  Provide the business details required for A2P 10DLC compliance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleStep1Next}>
                  <div className="space-y-2">
                    <Label htmlFor="legalBusinessName">Legal business name</Label>
                    <Input
                      id="legalBusinessName"
                      value={legalBusinessName}
                      onChange={(e) => setLegalBusinessName(e.target.value)}
                      placeholder="Acme Holdings LLC"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dbaName">DBA / brand name (if different)</Label>
                    <Input
                      id="dbaName"
                      value={dbaName}
                      onChange={(e) => setDbaName(e.target.value)}
                      placeholder="Acme Lead Partners"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business type</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger id="businessType">
                        <SelectValue placeholder="Select a business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="corp">Corporation</SelectItem>
                        <SelectItem value="sole_prop">Sole Proprietor</SelectItem>
                        <SelectItem value="nonprofit">Nonprofit</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="einOrRegistrationNumber">
                      EIN or business registration number
                    </Label>
                    <Input
                      id="einOrRegistrationNumber"
                      value={einOrRegistrationNumber}
                      onChange={(e) => setEinOrRegistrationNumber(e.target.value)}
                      placeholder="12-3456789"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business address</Label>
                    <Textarea
                      id="businessAddress"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="123 Main St, Suite 100, City, State, ZIP"
                      className="min-h-[90px]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessCountry">Country</Label>
                    <Input
                      id="businessCountry"
                      value={businessCountry}
                      onChange={(e) => setBusinessCountry(e.target.value)}
                      placeholder="United States"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourcompany.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessContactName">Business contact name</Label>
                    <Input
                      id="businessContactName"
                      value={businessContactName}
                      onChange={(e) => setBusinessContactName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessContactEmail">Business contact email</Label>
                    <Input
                      id="businessContactEmail"
                      type="email"
                      value={businessContactEmail}
                      onChange={(e) => setBusinessContactEmail(e.target.value)}
                      placeholder="jane@yourcompany.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessContactPhone">Business contact phone</Label>
                    <Textarea
                      id="businessContactPhone"
                      value={businessContactPhone}
                      onChange={(e) => setBusinessContactPhone(e.target.value)}
                      placeholder="+1 555 555 5555"
                      className="min-h-[70px]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">Business description (optional)</Label>
                    <Textarea
                      id="businessDescription"
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="We buy houses in NY/NJ."
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Next"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Step 2 (slides in from right) */}
        <div
          className={
            "absolute inset-0 transition-transform duration-500 " +
            (step === 2 ? "translate-x-0" : "translate-x-full")
          }
        >
          <div className="mx-auto max-w-3xl">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Step 2 — Upload your skiptraced list</CardTitle>
                <CardDescription>
                  First 100 are on us. Upload → map fields → verify numbers → split into Mobile + Landline groups.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">Upload CSV</div>
                        <div className="text-sm text-muted-foreground">
                          We’ll take you straight into mapping.
                        </div>
                      </div>
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => handleUpload(e.target.files?.[0])}
                        />
                        <Button type="button" variant="outline">
                          Choose file
                        </Button>
                      </label>
                    </div>
                  </div>

                  {processingStage !== "idle" ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                      <div className="font-medium">Processing</div>
                      <div className="mt-1 text-muted-foreground">
                        {processingStage === "mapping" && "Waiting for field mapping..."}
                        {processingStage === "verifying" && "Verifying phone numbers..."}
                        {processingStage === "splitting" &&
                          "Splitting into Mobile + Landline groups..."}
                        {processingStage === "done" && "Complete."}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={goStep1}>
                      Back
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mapping modal */}
        <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Map your fields</DialogTitle>
              <DialogDescription>
                For launch, this is intentionally minimal — confirm mapping then we auto-verify.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                Expected: Name, Phone, Address (optional)
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMappingOpen(false);
                    setProcessingStage("idle");
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={completeMapping}>
                  Confirm & Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
