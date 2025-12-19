import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

interface DripCampaign {
  id: string;
  name: string;
  totalContacts: number;
  schedule: string;
  active: boolean;
}

export default function DripsPage() {
  const [drips, setDrips] = useState<DripCampaign[]>([
    {
      id: "1",
      name: "7-Day Follow-up Sequence",
      totalContacts: 42,
      schedule: "Every 2 days",
      active: true,
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    frequency: "daily",
    days: "7",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call backend endpoint
    const newDrip: DripCampaign = {
      id: Date.now().toString(),
      name: formData.name,
      totalContacts: 0,
      schedule: `Every ${formData.frequency}`,
      active: true,
    };
    setDrips([...drips, newDrip]);
    setFormData({ name: "", frequency: "daily", days: "7" });
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    // TODO: Call backend DELETE
    setDrips(drips.filter((d) => d.id !== id));
  };

  const toggleActive = async (id: string) => {
    // TODO: Call backend to toggle
    setDrips(
      drips.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  };

  const dripStatuses = ["All", "Active", "Paused"] as const;
  const statusCounts = {
    All: drips.length,
    Active: drips.filter((d) => d.active).length,
    Paused: drips.filter((d) => !d.active).length,
  };
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  const filteredDrips =
    selectedStatus === "All"
      ? drips
      : selectedStatus === "Active"
      ? drips.filter((d) => d.active)
      : drips.filter((d) => !d.active);

  return (
    <MainLayout title="Drips">
      <div className="flex h-full w-full">
        {/* Secondary Sidebar */}
        <aside className="w-64 border-r border-border bg-sidebar/30 hidden md:flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground px-2 mb-2">
                Drip Status
              </h2>
              <nav className="space-y-1">
                {dripStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedStatus === status
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    {status} {statusCounts[status as keyof typeof statusCounts] > 0 && `(${statusCounts[status as keyof typeof statusCounts]})`}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Drip Campaigns</h1>
                  <p className="text-muted-foreground mt-2">
                    Set up automated follow-up sequences
                  </p>
                </div>
                <Button onClick={() => setIsCreating(true)} className="gap-2">
                  <Plus size={16} />
                  New Drip
                </Button>
              </div>

              {isCreating && (
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Drip Campaign</CardTitle>
                    <CardDescription>
                      Set up an automated follow-up sequence
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                      <div>
                        <Label htmlFor="drip-name">Campaign Name</Label>
                        <Input
                          id="drip-name"
                          placeholder="7-Day Follow-up"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="frequency">Frequency</Label>
                          <select
                            id="frequency"
                            value={formData.frequency}
                            onChange={(e) =>
                              setFormData({ ...formData, frequency: e.target.value })
                            }
                            className="w-full p-2 border rounded"
                          >
                            <option value="daily">Daily</option>
                            <option value="every-2-days">Every 2 Days</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="days">Duration (days)</Label>
                          <Input
                            id="days"
                            type="number"
                            value={formData.days}
                            onChange={(e) =>
                              setFormData({ ...formData, days: e.target.value })
                            }
                            min="1"
                            max="365"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">Create Drip</Button>
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
                {filteredDrips.map((drip) => (
                  <Card key={drip.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{drip.name}</CardTitle>
                          <CardDescription>{drip.schedule}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              drip.active
                                ? "bg-green-500/20 text-green-600"
                                : "bg-gray-500/20 text-gray-600"
                            }`}
                          >
                            {drip.active ? "Active" : "Paused"}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {drip.totalContacts} contacts in sequence
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActive(drip.id)}
                          >
                            {drip.active ? "Pause" : "Resume"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(drip.id)}
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
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
