import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function isK6SoftLimitGrade(grade?: string): boolean {
  return grade === "4" || grade === "5" || grade === "6";
}

interface K6SoftLimitAlertProps {
  grade?: string;
  className?: string;
}

export function K6SoftLimitAlert({ grade, className }: K6SoftLimitAlertProps) {
  if (!isK6SoftLimitGrade(grade)) {
    return null;
  }

  return (
    <Alert
      variant="default"
      className={`border-blue-500 bg-blue-50 dark:bg-blue-950 ${className ?? ""}`}
      data-testid="k6-soft-limit-warning"
    >
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-700 dark:text-blue-300">
        <strong>K-3 is still the strongest fit.</strong> Grades 4-6 are supported, but
        results may need extra teacher review and prompt refinement.
      </AlertDescription>
    </Alert>
  );
}
