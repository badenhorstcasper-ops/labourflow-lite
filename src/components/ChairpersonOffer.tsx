import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gavel } from "lucide-react";
import BookHearingDialog from "./BookHearingDialog";

type Props = {
  documentId?: string;
  employeeName?: string;
};

export default function ChairpersonOffer({ documentId, employeeName }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <>
      <Card className="border-primary/40">
        <CardContent className="p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-primary mt-0.5"><Gavel className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="font-semibold">Need a chairperson for this hearing?</p>
              <p className="text-sm text-muted-foreground">
                iNRECO can chair the hearing online (Teams or Google Meet) and draft the written
                outcome for you. Flat fee <span className="font-medium text-foreground">R2,500</span> —
                invoiced after the hearing is scheduled.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>No thanks</Button>
            <Button size="sm" onClick={() => setOpen(true)}>Book a Hearing</Button>
          </div>
        </CardContent>
      </Card>

      <BookHearingDialog
        open={open}
        onOpenChange={setOpen}
        documentId={documentId}
        employeeName={employeeName}
      />
    </>
  );
}
