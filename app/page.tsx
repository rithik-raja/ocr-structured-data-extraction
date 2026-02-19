"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Highlight = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type UploadedCertificate = {
  id: string;
  name: string;
  imageUrl: string;
  highlights: Highlight[];
};

const FAKE_HIGHLIGHTS: Highlight[] = [
  {
    id: "h-name",
    x: 0.07,
    y: 0.15,
    width: 0.34,
    height: 0.05,
    text: "Name: JOHN A DOE",
  },
  {
    id: "h-dob",
    x: 0.07,
    y: 0.24,
    width: 0.23,
    height: 0.05,
    text: "DOB: 02/14/1951",
  },
  {
    id: "h-dod",
    x: 0.07,
    y: 0.31,
    width: 0.24,
    height: 0.05,
    text: "Date of Death: 01/28/2026",
  },
  {
    id: "h-ssn",
    x: 0.55,
    y: 0.24,
    width: 0.22,
    height: 0.05,
    text: "SSN: XXX-XX-6789",
  },
  {
    id: "h-address",
    x: 0.55,
    y: 0.32,
    width: 0.33,
    height: 0.09,
    text: "Address: 123 Main St, Austin, TX",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fakeProcessCertificate(): Promise<Highlight[]> {
  await sleep(1500);
  return FAKE_HIGHLIGHTS;
}

function normalizeHighlights(highlights: Highlight[]) {
  return highlights.map((highlight) => {
    const x = Math.max(0, Math.min(1, highlight.x));
    const y = Math.max(0, Math.min(1, highlight.y));
    const width = Math.max(0, Math.min(1 - x, highlight.width));
    const height = Math.max(0, Math.min(1 - y, highlight.height));

    return {
      ...highlight,
      x,
      y,
      width,
      height,
    };
  });
}

export default function Home() {
  const [uploads, setUploads] = useState<UploadedCertificate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processingUploadId, setProcessingUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdObjectUrlsRef = useRef<string[]>([]);

  const selectedUpload = useMemo(
    () => uploads.find((upload) => upload.id === selectedId) ?? null,
    [uploads, selectedId]
  );

  const isProcessing = processingUploadId !== null;

  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function runProcessing(uploadId: string) {
    setProcessingUploadId(uploadId);

    try {
      const result = await fakeProcessCertificate();

      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === uploadId
            ? { ...upload, highlights: normalizeHighlights(result) }
            : upload
        )
      );
    } finally {
      setProcessingUploadId(null);
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const newUploads = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      imageUrl: URL.createObjectURL(file),
      highlights: [],
    }));

    createdObjectUrlsRef.current.push(...newUploads.map((upload) => upload.imageUrl));

    setUploads((prev) => [...prev, ...newUploads]);
    setSelectedId((prev) => prev ?? newUploads[0].id);
    event.target.value = "";
  }

  async function handleRunProcess() {
    if (!selectedUpload || isProcessing) {
      return;
    }

    await runProcessing(selectedUpload.id);
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-zinc-100 text-zinc-900">
        <aside className="flex w-80 shrink-0 flex-col border-r bg-background">
          <div className="p-4">
            <h1 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Input Files
            </h1>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={isProcessing}
            />
            <Button
              className="mt-3 w-full"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Images
            </Button>
          </div>

          <Separator />

          <ScrollArea className="min-h-0 flex-1 p-3">
            <div className="space-y-3 pr-3">
              {uploads.map((upload) => {
                const isSelected = upload.id === selectedId;

                return (
                  <button
                    key={upload.id}
                    type="button"
                    className={cn("w-full text-left", isSelected && "outline-none")}
                    onClick={() => setSelectedId(upload.id)}
                    disabled={isProcessing}
                  >
                    <Card
                      className={cn(
                        "gap-2 py-2 transition-colors",
                        isSelected ? "border-primary bg-accent/40" : "hover:bg-accent/20"
                      )}
                    >
                      <CardContent className="px-2">
                        <div className="overflow-hidden rounded-md bg-zinc-200">
                          <img
                            src={upload.imageUrl}
                            alt={upload.name}
                            className="h-28 w-full object-cover"
                          />
                        </div>
                        <p className="mt-2 truncate text-xs font-medium text-muted-foreground">
                          {upload.name}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}

              {uploads.length === 0 && (
                <Card className="border-dashed py-4 shadow-none">
                  <CardContent className="px-4 text-xs text-muted-foreground">
                    Upload one or more certificate images to begin processing.
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 items-center border-b bg-background px-4">
            <Button onClick={handleRunProcess} disabled={!selectedUpload || isProcessing}>
              {isProcessing && <Spinner className="size-4" />}
              Run Process
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            {!selectedUpload && (
              <Card className="w-full max-w-xl border-dashed py-8 shadow-none">
                <CardContent className="text-center text-sm text-muted-foreground">
                  Select an uploaded image to view highlights.
                </CardContent>
              </Card>
            )}

            {selectedUpload && (
              <Card className="max-h-full max-w-full overflow-auto p-4">
                <div className="relative inline-block">
                  <img
                    src={selectedUpload.imageUrl}
                    alt={selectedUpload.name}
                    className="block max-h-[75vh] max-w-[calc(100vw-28rem)] object-contain"
                  />

                  <div className="absolute inset-0">
                    {selectedUpload.highlights.map((highlight) => (
                      <Tooltip key={highlight.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute cursor-pointer rounded-sm border border-amber-500/90 bg-amber-300/30"
                            style={{
                              left: `${highlight.x * 100}%`,
                              top: `${highlight.y * 100}%`,
                              width: `${highlight.width * 100}%`,
                              height: `${highlight.height * 100}%`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4}>
                          {highlight.text}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
