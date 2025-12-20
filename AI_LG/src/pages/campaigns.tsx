import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PageShell } from "@/components/app/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type CampaignOption = {
  id: "mobile" | "landline" | "no-ai";
  title: string;
  subtitle: string;
};

const options: CampaignOption[] = [
  {
    id: "mobile",
    title: "(Mobile) AI SMS + AI Warm Calls Campaign",
    subtitle: "Automated SMS + warm calling for mobile numbers.",
  },
  {
    id: "landline",
    title: "(Landline) AI Cold Calling Campaign",
    subtitle: "AI handles cold calling for landlines.",
  },
  {
    id: "no-ai",
    title: "No AI — Do it myself Campaign",
    subtitle: "Manual outreach using Lead Genie tooling.",
  },
];

export default function CampaignsPage() {
  const [, setLocation] = useLocation();

  const [selectedId, setSelectedId] = useState<CampaignOption["id"]>("mobile");

  const listResult = useMemo(() => {
    try {
      const raw = localStorage.getItem("ai_leadgenie_list_result");
      return raw ? (JSON.parse(raw) as any) : null;
    } catch {
      return null;
    }
  }, []);

  const selected = useMemo(
    () => options.find((o) => o.id === selectedId) ?? options[0],
    [selectedId]
  );

  const goSetup = (preferredStep: 1 | 2) => {
    if (preferredStep === 2) return setLocation("/setup?step=2");

    // If business info already exists, skip to upload.
    try {
      const raw = localStorage.getItem("ai_leadgenie_business");
      if (raw) return setLocation("/setup?step=2");
    } catch {
      // ignore
    }

    return setLocation("/setup?step=1");
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Choose a campaign type and start immediately.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => goSetup(2)}>
              Upload List
            </Button>
            <Button onClick={() => goSetup(1)}>Start New Campaign</Button>
          </div>
        </div>

        {listResult ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Mobile: {listResult.mobileCount ?? "—"}</Badge>
            <Badge variant="secondary">Landline: {listResult.landlineCount ?? "—"}</Badge>
          </div>
        ) : null}

        {/* Main dashboard layout (simple, matching the “Campaign Details” header + left drawer trigger pattern) */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Campaign Details</CardTitle>
              <div className="text-sm text-muted-foreground">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-9">
                      Select Campaign
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-background">
                    <SheetHeader>
                      <SheetTitle>Select Campaign</SheetTitle>
                    </SheetHeader>

                    <div className="mt-4 space-y-2">
                      {options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedId(opt.id)}
                          className={
                            "w-full rounded-md border px-3 py-3 text-left transition-colors " +
                            (opt.id === selectedId
                              ? "border-primary bg-primary/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10")
                          }
                        >
                          <div className="text-sm font-semibold text-foreground">{opt.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{opt.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">Market: —</div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-6">
                  <div className="text-sm text-muted-foreground">Selected campaign</div>
                  <div className="mt-1 text-base font-semibold">{selected.title}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-6">
                  <div className="text-sm font-semibold">All Prospects</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    This lightweight app keeps UI minimal. Prospect tables will populate after list upload and verification.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-6">
                  <div className="text-sm font-semibold">Campaign Options</div>
                  <div className="mt-3 space-y-2">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedId(opt.id)}
                        className={
                          "w-full rounded-md border px-3 py-3 text-left transition-colors " +
                          (opt.id === selectedId
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10")
                        }
                      >
                        <div className="text-sm font-semibold text-foreground">{opt.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{opt.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={() => setLocation("/campaigns")}>Start Campaign</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
