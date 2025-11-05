"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { CodeBlock } from "@/components/elements/code-block";
import { CheckCircleFillIcon, CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FormStatusCardProps = {
  formId: string;
};

export function FormStatusCard({ formId }: FormStatusCardProps) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copiedLink, setCopiedLink] = useState(false);
  const [embedMode, setEmbedMode] = useState<"inline" | "fullpage">("inline");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const themeParam = theme === "system" ? "" : `?theme=${theme}`;
  const formUrl = `${origin}/f/${formId}${themeParam}`;

  const inlineEmbedCode = `<iframe
  src="${formUrl}"
  width="100%"
  height="600px"
  frameborder="0"
  allow="microphone; camera; clipboard-write"
  style="border: 0;"
></iframe>`;

  const fullPageEmbedCode = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Form</title>
    <style>
      body, html { margin: 0; padding: 0; height: 100%; overflow: hidden }
    </style>
  </head>
  <body>
    <iframe
      src="${formUrl}"
      width="100%"
      height="100%"
      frameborder="0"
      allow="microphone; camera; clipboard-write"
      style="border: 0; display: block"
    ></iframe>
  </body>
</html>`;

  const embedCode =
    embedMode === "inline" ? inlineEmbedCode : fullPageEmbedCode;

  const handleCopyLink = async () => {
    await copyToClipboard(formUrl);
    setCopiedLink(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircleFillIcon />
          <CardTitle className="font-semibold text-lg">
            Form Published Successfully!
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Your form is now live and ready to collect responses.
        </p>

        <Tabs className="w-full" defaultValue="link">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="embed">Embed Code</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-3" value="link">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
                readOnly
                type="text"
                value={formUrl}
              />
              <Button onClick={handleCopyLink} size="sm" variant="outline">
                <CopyIcon />
                {copiedLink ? "Copied!" : "Copy"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent className="space-y-4" value="embed">
            <div className="space-y-3">
              <div className="flex gap-6">
                <div className="space-y-2">
                  <p className="font-medium text-sm">Embed Type</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEmbedMode("inline")}
                      size="sm"
                      variant={embedMode === "inline" ? "default" : "outline"}
                    >
                      Inline
                    </Button>
                    <Button
                      onClick={() => setEmbedMode("fullpage")}
                      size="sm"
                      variant={embedMode === "fullpage" ? "default" : "outline"}
                    >
                      Full Page
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">Theme</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setTheme("system")}
                      size="sm"
                      variant={theme === "system" ? "default" : "outline"}
                    >
                      System
                    </Button>
                    <Button
                      onClick={() => setTheme("light")}
                      size="sm"
                      variant={theme === "light" ? "default" : "outline"}
                    >
                      Light
                    </Button>
                    <Button
                      onClick={() => setTheme("dark")}
                      size="sm"
                      variant={theme === "dark" ? "default" : "outline"}
                    >
                      Dark
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Embed Code</p>
                <p className="text-muted-foreground text-xs">
                  {embedMode === "inline"
                    ? "Paste this code in your HTML where you want the form to appear."
                    : "Save this as an HTML file and host it on your website."}
                </p>
                <CodeBlock
                  code={embedCode}
                  language="html"
                  showLineNumbers={false}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
