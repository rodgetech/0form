"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { CheckCircleFillIcon, CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormStatusCardProps = {
  formId: string;
};

export function FormStatusCard({ formId }: FormStatusCardProps) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${formId}`;

  const handleCopy = async () => {
    await copyToClipboard(formUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircleFillIcon className="text-green-600" size={20} />
          <CardTitle className="font-semibold text-lg">
            Form Published Successfully!
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Your form is now live and ready to collect responses.
        </p>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
            readOnly
            type="text"
            value={formUrl}
          />
          <Button onClick={handleCopy} size="sm" variant="outline">
            <CopyIcon className="mr-2" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
