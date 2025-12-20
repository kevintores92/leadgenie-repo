import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, MapPin, User, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const businessTypes = [
  "Sole Proprietorship",
  "Partnership",
  "LLC",
  "Corporation",
  "Nonprofit",
  "Other"
];

const countries = ["United States", "Canada", "Mexico"];

const registrationSteps = [
  {
    number: 1,
    title: "Business Profile",
    description: "Legal identity verification"
  },
  {
    number: 2,
    title: "Brand Registration",
    description: "TCR vetting process"
  },
  {
    number: 3,
    title: "Campaign Usage",
    description: "Use case declaration"
  }
];

export default function BusinessInfo() {
  const [formData, setFormData] = useState({
    legalName: "",
    dbaName: "",
    businessType: "",
    ein: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    website: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // "Park" 10DLC submission until a paid plan is chosen.
      localStorage.setItem("lg.10dlc.draft", JSON.stringify(formData));
      navigate("/upload");
    } catch (err) {
      toast({
        title: "Could not save business info",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Business Verification</h1>
              <p className="text-muted-foreground">Complete your profile for A2P 10DLC Registration</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Side - Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Identity Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-2xl p-8 border border-white/5"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      ✓
                    </div>
                    <h3 className="text-lg font-semibold">Company Identity</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Provide your official business details exactly as they appear on tax records.</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="legalName" className="text-sm font-medium">
                        Legal Business Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="legalName"
                        data-testid="input-legal-name"
                        name="legalName"
                        value={formData.legalName}
                        onChange={handleChange}
                        placeholder="Acme Corp, Inc."
                        required
                        className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbaName" className="text-sm font-medium">
                        DBA / Brand Name <span className="text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="dbaName"
                        data-testid="input-dba-name"
                        name="dbaName"
                        value={formData.dbaName}
                        onChange={handleChange}
                        placeholder="Acme"
                        className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType" className="text-sm font-medium">
                        Business Type <span className="text-destructive">*</span>
                      </Label>
                      <Select value={formData.businessType} onValueChange={(value) => handleSelectChange("businessType", value)}>
                        <SelectTrigger className="glass-card border-white/10 focus:border-primary">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10">
                          {businessTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ein" className="text-sm font-medium">
                        EIN / Registration Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="ein"
                        data-testid="input-ein"
                        name="ein"
                        value={formData.ein}
                        onChange={handleChange}
                        placeholder="12-3456789"
                        required
                        className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Location & Presence Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card rounded-2xl p-8 border border-white/5"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      📍
                    </div>
                    <h3 className="text-lg font-semibold">Location & Presence</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-medium">
                        Business Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="address"
                        data-testid="input-address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="123 Innovation Dr, Suite 100, Tech City, CA 94000"
                        required
                        className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                      />
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">City</Label>
                        <Input
                          id="city"
                          data-testid="input-city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Tech City"
                          className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium">State</Label>
                        <Input
                          id="state"
                          data-testid="input-state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="CA"
                          className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zip" className="text-sm font-medium">ZIP Code</Label>
                        <Input
                          id="zip"
                          data-testid="input-zip"
                          name="zip"
                          value={formData.zip}
                          onChange={handleChange}
                          placeholder="94000"
                          className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium">
                          Country <span className="text-destructive">*</span>
                        </Label>
                        <Select value={formData.country} onValueChange={(value) => handleSelectChange("country", value)}>
                          <SelectTrigger className="glass-card border-white/10 focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-white/10">
                            {countries.map(country => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-medium">
                        Website URL <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">🌐</span>
                        <Input
                          id="website"
                          data-testid="input-website"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          placeholder="https://www.example.com"
                          required
                          className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Point of Contact Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card rounded-2xl p-8 border border-white/5"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      👤
                    </div>
                    <h3 className="text-lg font-semibold">Point of Contact</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="text-sm font-medium">
                        Contact Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contactName"
                        data-testid="input-contact-name"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        placeholder="Jane Doe"
                        required
                        className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPhone" className="text-sm font-medium">
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">📞</span>
                        <Input
                          id="contactPhone"
                          data-testid="input-contact-phone"
                          name="contactPhone"
                          type="tel"
                          value={formData.contactPhone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          required
                          className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="contactEmail" className="text-sm font-medium">
                        Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contactEmail"
                        data-testid="input-contact-email"
                        name="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="jane@company.com"
                        required
                        className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Business Description <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <textarea
                      id="description"
                      data-testid="textarea-description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Briefly describe what your business does..."
                      className="glass-card border border-white/10 rounded-lg px-4 py-3 focus:border-primary focus:bg-white/5 resize-none h-24 font-sans text-sm"
                    />
                    <p className="text-xs text-muted-foreground">This description helps carriers understand your message content.</p>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="button-back"
                    onClick={() => window.history.back()}
                    className="flex-1 h-11 border-white/10 hover:bg-white/5"
                  >
                    Back
                  </Button>
                  <Button
                    data-testid="button-continue"
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold"
                  >
                    {loading ? "Processing..." : "Submit & Continue"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Side - 10DLC Info Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-1"
            >
              <div className="glass-card rounded-2xl p-6 border border-primary/30 sticky top-32 space-y-6">
                {/* Why This is Required */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Why this is required</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To send messages to US phone numbers, carriers require businesses to register their brand and campaigns (A2P 10DLC). This ensures high delivery rates and protects consumers from spam.
                  </p>
                </div>

                {/* Registration Steps */}
                <div className="pt-6 border-t border-white/5">
                  <h4 className="font-semibold mb-4">Registration Steps</h4>
                  <div className="space-y-4">
                    {registrationSteps.map((step, index) => (
                      <motion.div
                        key={step.number}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex gap-4"
                      >
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border border-primary/30">
                            <span className="text-sm font-bold text-primary">{step.number}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
