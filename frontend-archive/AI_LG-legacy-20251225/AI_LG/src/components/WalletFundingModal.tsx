import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard } from "lucide-react";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface WalletFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  suggestedAmount?: number;
  onSuccess?: () => void;
}

export function WalletFundingModal({ 
  isOpen, 
  onClose, 
  currentBalance,
  suggestedAmount = 0,
  onSuccess 
}: WalletFundingModalProps) {
  const [error, setError] = useState("");
  const [paypalRendered, setPaypalRendered] = useState(false);

  useEffect(() => {
    if (isOpen && window.paypal && !paypalRendered) {
      setPaypalRendered(true);
      
      window.paypal.HostedButtons({
        hostedButtonId: "T2G2M28MTFRHY"
      }).render("#paypal-container-T2G2M28MTFRHY")
        .then(() => {
          console.log('PayPal hosted button rendered');
        })
        .catch((err: any) => {
          console.error('PayPal rendering error:', err);
          setError("Failed to load payment button. Please refresh.");
          setPaypalRendered(false);
        });
    }
  }, [isOpen, paypalRendered]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Add Funds to Wallet
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="text-green-400 font-semibold">${currentBalance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Suggested Amount Info */}
          {suggestedAmount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-300">
                <strong>Campaign requires:</strong> ${suggestedAmount.toFixed(2)}
                <br />
                <span className="text-xs text-muted-foreground">
                  Your current balance is insufficient to launch this campaign
                </span>
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* PayPal Hosted Button Section */}
          <div className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <p className="text-sm font-semibold text-blue-400">Add Funds with PayPal</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose an amount and complete payment securely through PayPal
              </p>
            </div>

            {/* PayPal Hosted Button Container */}
            <div id="paypal-container-T2G2M28MTFRHY" className="min-h-[200px]">
              {/* PayPal hosted button will render here */}
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💡 Tip: Funds are instantly available after payment confirmation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
