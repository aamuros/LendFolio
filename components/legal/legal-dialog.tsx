"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LegalContent } from "@/components/legal/legal-content";

type LegalDialogProps = {
  trigger: React.ReactNode;
  content: LegalContent;
};

export function LegalDialog({ trigger, content }: LegalDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-1rem)] flex-col gap-0 p-0 sm:max-w-[640px]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
          <p className="text-xs text-muted-foreground">
            {content.displayVersion} &middot; {content.lastUpdated}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 pb-6">
            {content.sections.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {section.heading}
                </h3>
                <div className="space-y-2">
                  {section.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent px-6 py-4">
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
