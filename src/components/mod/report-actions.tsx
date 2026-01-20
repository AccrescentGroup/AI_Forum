"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { resolveReport } from "@/lib/actions";
import { Check, X } from "lucide-react";

interface ReportActionsProps {
  reportId: string;
}

export function ReportActions({ reportId }: ReportActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: "RESOLVE" | "DISMISS") => {
    setIsLoading(true);

    try {
      await resolveReport(reportId, action);
      toast({
        title: action === "RESOLVE" ? "Report resolved" : "Report dismissed",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("RESOLVE")}
        disabled={isLoading}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <Check className="h-4 w-4 mr-1" />
        Resolve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("DISMISS")}
        disabled={isLoading}
        className="text-gray-600 hover:text-gray-700"
      >
        <X className="h-4 w-4 mr-1" />
        Dismiss
      </Button>
    </div>
  );
}

