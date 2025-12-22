import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard, Loader2 } from "lucide-react";

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
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : "50.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const paypalRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);

  const quickAmounts = [25, 50, 100, 250, 500];

  useEffect(() => {
    if (isOpen && window.paypal && paypalRef.current && !paypalRendered.current) {
      paypalRendered.current = true;
      
      window.paypal.Buttons({
        createOrder: (data: any, actions: any) => {
          const numAmount = parseFloat(amount);
          if (isNaN(numAmount) || numAmount < 10) {
            setError("Minimum reload amount is $10");
            return;
          }
          
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: numAmount.toFixed(2)
              },
              description: 'Lead Genie Wallet Reload'
            }]
          });
        },
        onApprove: async (data: any, actions: any) => {
          setLoading(true);
          try {
            const order = await actions.order.capture();
            console.log('Payment successful:', order);
            
            // TODO: Send to backend to credit wallet
            // await api.creditWallet(order.id, parseFloat(amount));
            
            onSuccess?.();
            onClose();
          } catch (err: any) {
            setError(err.message || "Payment processing failed");
          } finally {
            setLoading(false);
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          setError("Payment failed. Please try again.");
        }
      }).render(paypalRef.current);
    }
    
    return () => {
      if (paypalRef.current) {
        paypalRef.current.innerHTML = '';
        paypalRendered.current = false;
      }
    };
  }, [isOpen, amount]);

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    // Reset PayPal buttons when amount changes
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
      paypalRendered.current = false;
    }
  };

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
          {/* Suggested Amount (if provided) */}
          {suggestedAmount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-300">
                <strong>Suggested amount:</strong> ${suggestedAmount.toFixed(2)}
                <br />
                <span className="text-xs text-muted-foreground">
                  To cover your current campaign cost
                </span>
              </p>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount to Add
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="10"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="glass-card border-white/10 focus:border-primary pl-8"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum: $10.00</p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Select</Label>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map(amt => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAmountChange(amt.toString())}
                  className="border-white/10 hover:bg-primary/20 hover:border-primary/50"
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* PayPal Integration Section */}
          <div className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <p className="text-sm font-semibold text-blue-400">Pay with PayPal</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Secure payment processing through PayPal. You can use your PayPal balance, bank account, or credit/debit card.
              </p>
            </div>

            {/* PayPal Smart Payment Buttons */}
            <div ref={paypalRef} id="paypal-button-container" className="min-h-[50px]">
              {/* PayPal SDK buttons will render here */}
            </div>
          </div>

          {/* Manual Checkout Button (fallback) */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            {/* Backup manual button removed - PayPal buttons handle payment */}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💡 Tip: Enable auto-reload to never run out of balance during campaigns
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
