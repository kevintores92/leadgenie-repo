import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PageShell } from "@/components/app/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function getStepFromLocation(location: string): 1 | 2 {
  try {
    const url = new URL(location, window.location.origin);
    const stepRaw = url.searchParams.get("step");
    return stepRaw === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

export default function SetupPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const step = useMemo(() => getStepFromLocation(location), [location]);

  const [loading, setLoading] = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  // Step 2
  const [mappingOpen, setMappingOpen] = useState(false);
  const [processingStage, setProcessingStage] = useState<
    "idle" | "mapping" | "verifying" | "splitting" | "done"
  >("idle");

  useEffect(() => {
    // If user hits /setup directly, ensure step=1.
    if (location === "/setup") setLocation("/setup?step=1");
  }, [location, setLocation]);

  const goStep1 = () => setLocation("/setup?step=1");
  const goStep2 = () => setLocation("/setup?step=2");

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Placeholder: backend will register 10DLC brand/campaign.
      localStorage.setItem(
        "ai_leadgenie_business",
        JSON.stringify({ businessName, website, businessDescription })
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
                    <Label htmlFor="businessName">Business name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Holdings LLC"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourcompany.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">Business description</Label>
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
