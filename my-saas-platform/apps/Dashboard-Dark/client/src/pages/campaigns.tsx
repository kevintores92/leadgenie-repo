import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Pause, Trash2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  createdAt: string;
  messageCount?: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: "1",
      name: "Q4 Investor Outreach",
      status: "RUNNING",
      createdAt: "2025-12-15",
      messageCount: 156,
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", template: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call backend endpoint
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: formData.name,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
    setCampaigns([...campaigns, newCampaign]);
    setFormData({ name: "", template: "" });
    setIsCreating(false);
  };

  const handleStart = async (id: string) => {
    // TODO: Call backend /campaigns/{id}/start
    setCampaigns(
      campaigns.map((c) =>
        c.id === id ? { ...c, status: "RUNNING" as const } : c
      )
    );
  };

  const handlePause = async (id: string) => {
    // TODO: Call backend /campaigns/{id}/pause
    setCampaigns(
      campaigns.map((c) =>
        c.id === id ? { ...c, status: "PAUSED" as const } : c
      )
    );
  };

  const handleDelete = async (id: string) => {
    // TODO: Call backend DELETE
    setCampaigns(campaigns.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your outreach campaigns
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="gap-2"
        >
          <Plus size={16} />
          New Campaign
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
            <CardDescription>Set up a new outreach campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="Q1 Investor List"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="template">Message Template</Label>
                <textarea
                  id="template"
                  placeholder="Hi {name}, I'm interested in discussing your property..."
                  value={formData.template}
                  onChange={(e) =>
                    setFormData({ ...formData, template: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Campaign</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>
                    Created {new Date(campaign.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    campaign.status === "RUNNING"
                      ? "bg-green-500/20 text-green-600"
                      : campaign.status === "PAUSED"
                      ? "bg-yellow-500/20 text-yellow-600"
                      : "bg-gray-500/20 text-gray-600"
                  }`}
                >
                  {campaign.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {campaign.messageCount ? (
                    <>{campaign.messageCount} messages sent</>
                  ) : (
                    <>Ready to send</>
                  )}
                </div>
                <div className="flex gap-2">
                  {campaign.status === "DRAFT" ||
                  campaign.status === "PAUSED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStart(campaign.id)}
                      className="gap-1"
                    >
                      <Play size={14} />
                      Start
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePause(campaign.id)}
                      className="gap-1"
                    >
                      <Pause size={14} />
                      Pause
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(campaign.id)}
                    className="gap-1 text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
