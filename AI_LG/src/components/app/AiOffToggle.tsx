import { useCallback, useState } from "react";
import { Switch } from "@/components/ui/switch";

export function AiOffToggle() {
  const [checked, setChecked] = useState(false);

  const onCheckedChange = useCallback((next: boolean) => {
    setChecked(next);
    if (next) {
      window.location.href = "https://app.leadgenie.online";
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Turn Off AI Services</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
