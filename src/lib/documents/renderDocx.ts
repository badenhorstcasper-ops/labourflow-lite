import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
  PageNumber,
  HeightRule,
  LevelFormat,
} from "docx";
import {
  companyFooterLine,
  companyHeaderMeta,
  defaultSignatures,
  type RenderContext,
} from "./types";

async function fetchLogoBytes(url?: string | null): Promise<{ data: Uint8Array; type: "png" | "jpg" } | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    const type: "png" | "jpg" = ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : "png";
    return { data: new Uint8Array(await r.arrayBuffer()), type };
  } catch {
    return null;
  }
}

const cellNoBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

export async function renderDocx(ctx: RenderContext): Promise<Uint8Array> {
  const { template, company, docNumber, generatedAt } = ctx;
  const accent = (company.accent_color || "#2563eb").replace("#", "");

  const logo = await fetchLogoBytes(company.logo_url);

  // Header: 2-col table — logo left, company info right
  const headerLeft: Paragraph[] = [];
  if (logo) {
    headerLeft.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: logo.type,
            data: logo.data,
            transformation: { width: 90, height: 45 },
            altText: { title: "Logo", description: company.company_name, name: "logo" },
          }),
        ],
      })
    );
  } else {
    headerLeft.push(new Paragraph({ children: [new TextRun("")] }));
  }

  const meta = companyHeaderMeta(company);
  const headerRight: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: company.company_name || "Your Company", bold: true, size: 22 })],
    }),
  ];
  if (company.trading_name && company.trading_name !== company.company_name) {
    headerRight.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: company.trading_name, size: 18, color: "6B7280" })],
      })
    );
  }
  if (meta) {
    headerRight.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: meta, size: 16, color: "6B7280" })],
      })
    );
  }
  headerRight.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `Doc #: ${docNumber}`, size: 16, color: "6B7280" })],
    })
  );
  headerRight.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Date: ${generatedAt.toISOString().slice(0, 10)}`,
          size: 16,
          color: "6B7280",
        }),
      ],
    })
  );

  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellNoBorder,
            width: { size: 4680, type: WidthType.DXA },
            children: headerLeft,
          }),
          new TableCell({
            borders: cellNoBorder,
            width: { size: 4680, type: WidthType.DXA },
            children: headerRight,
          }),
        ],
      }),
    ],
  });

  // Accent rule (paragraph with bottom border)
  const accentRule = new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 18, color: accent, space: 1 },
    },
    children: [new TextRun("")],
  });

  // Body
  const body: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { before: 240, after: 60 },
      children: [new TextRun({ text: template.title, bold: true, size: 36 })],
    }),
  ];
  if (template.subtitle) {
    body.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: template.subtitle, size: 22, color: "6B7280" })],
      })
    );
  }

  const runsToTextRuns = (
    runs: { text: string; bold?: boolean }[] | undefined,
    fallback: string,
    extra: { size: number; bold?: boolean } = { size: 22 }
  ): TextRun[] => {
    const src = runs && runs.length ? runs : [{ text: fallback }];
    return src.map(
      (r) =>
        new TextRun({
          text: r.text,
          size: extra.size,
          bold: extra.bold || r.bold || false,
        })
    );
  };

  for (const block of template.body) {
    if (block.kind === "p") {
      body.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120, line: 300 },
          children: runsToTextRuns(block.runs, block.text, { size: 22 }),
        })
      );
    } else if (block.kind === "h") {
      body.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: block.text, bold: true, size: 26 })],
        })
      );
    } else if (block.kind === "list") {
      block.items.forEach((item, i) => {
        body.push(
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: runsToTextRuns(block.itemRuns?.[i], item, { size: 22 }),
          })
        );
      });
    } else if (block.kind === "spacer") {
      body.push(new Paragraph({ children: [new TextRun("")] }));
    }
  }


  // Signatures
  const sigs = template.signatures || defaultSignatures(company);
  body.push(new Paragraph({ spacing: { before: 600 }, children: [new TextRun("")] }));
  const sigCellWidth = Math.floor(9360 / sigs.length);
  body.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: sigs.map(() => sigCellWidth),
      rows: [
        new TableRow({
          height: { value: 600, rule: HeightRule.ATLEAST },
          children: sigs.map(
            (s) =>
              new TableCell({
                width: { size: sigCellWidth, type: WidthType.DXA },
                borders: {
                  ...cellNoBorder,
                  top: { style: BorderStyle.SINGLE, size: 6, color: "111827" },
                },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: s.label, size: 18, color: "6B7280" })],
                  }),
                  ...(s.name
                    ? [
                        new Paragraph({
                          children: [new TextRun({ text: s.name, size: 20 })],
                        }),
                      ]
                    : []),
                ],
              })
          ),
        }),
      ],
    })
  );

  // Footer
  const footerLine = companyFooterLine(company) || company.company_name;
  const footer = new Footer({
    children: [
      new Paragraph({
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB", space: 4 },
        },
        children: [new TextRun("")],
      }),
      new Paragraph({
        tabStops: [{ type: "right" as never, position: 9360 }],
        children: [
          new TextRun({ text: footerLine, size: 16, color: "6B7280" }),
          new TextRun({ text: "\tPage ", size: 16, color: "6B7280" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "6B7280" }),
          new TextRun({ text: " of ", size: 16, color: "6B7280" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "6B7280" }),
        ],
      }),
    ],
  });

  const header = new Header({ children: [headerTable, accentRule] });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 2200, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: body,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}

// Compile-time check: forbidden brand names must never appear in this module.
// (Codified via test in src/lib/documents/__tests__/brand.test.ts)
