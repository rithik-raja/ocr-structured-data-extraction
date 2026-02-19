import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { tmpAzureOcr } from "@/lib/tmpAzureOcr";

export type Highlight = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type OcrWord = {
  content: string;
  polygon: number[];
};

type Coordinate = [number, number];

type FieldMatch = {
  word: string;
  coordinate: Coordinate;
};

type ParsedFieldValues = {
  name: FieldMatch[];
  dateOfBirth: FieldMatch[];
  address: FieldMatch[];
  causeOfDeath: FieldMatch[];
};

const fieldItemSchema = z.array(
  z.object({
    word: z.string(),
    coordinate: z.tuple([z.number(), z.number()]),
  })
);
const parsedFieldsSchema = z.object({
  name: fieldItemSchema,
  dateOfBirth: fieldItemSchema,
  address: fieldItemSchema,
  causeOfDeath: fieldItemSchema,
});

const geminiClient = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_DEMO_GEMINI_KEY,
});

function getOcrWordsAndPage() {
  const page = tmpAzureOcr.analyzeResult.pages[0];
  return {
    page,
    words: page.words as OcrWord[],
  };
}

function toTopLeftOcrLines(words: OcrWord[]) {
  return words
    .map((word) => {
      const x = word.polygon[0] ?? 0;
      const y = word.polygon[1] ?? 0;
      return `${word.content}:${x}, ${y}`;
    })
    .join("\n");
}

function wordToHighlight(
  word: OcrWord,
  pageWidth: number,
  pageHeight: number,
  text: string,
  id: string
) {
  const allXs = [
    word.polygon[0],
    word.polygon[2],
    word.polygon[4],
    word.polygon[6],
  ];
  const allYs = [
    word.polygon[1],
    word.polygon[3],
    word.polygon[5],
    word.polygon[7],
  ];

  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);

  return {
    id,
    text,
    x: minX / pageWidth,
    y: minY / pageHeight,
    width: (maxX - minX) / pageWidth,
    height: (maxY - minY) / pageHeight,
  };
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

function mapFieldListToHighlights(
  fieldLabel: string,
  fieldKey: string,
  values: FieldMatch[],
  words: OcrWord[],
  pageWidth: number,
  pageHeight: number
) {
  const wordByTopLeft = new Map(
    words.map((word) => [`${word.polygon[0] ?? 0},${word.polygon[1] ?? 0}`, word])
  );

  return values
    .map((value, index) => {
      const [x, y] = value.coordinate;
      const matchedWord = wordByTopLeft.get(`${x},${y}`);
      if (matchedWord === undefined) {
        return null;
      }
      return wordToHighlight(
        matchedWord,
        pageWidth,
        pageHeight,
        `${fieldLabel}: ${value.word}`,
        `h-${fieldKey}-${index}`
      );
    })
    .filter((highlight): highlight is Highlight => Boolean(highlight));
}

function mapFieldsToHighlights(
  fields: ParsedFieldValues,
  words: OcrWord[],
  pageWidth: number,
  pageHeight: number
) {
  const highlights = [
    ...mapFieldListToHighlights(
      "Name",
      "name",
      fields.name,
      words,
      pageWidth,
      pageHeight
    ),
    ...mapFieldListToHighlights(
      "Date of Birth",
      "dateOfBirth",
      fields.dateOfBirth,
      words,
      pageWidth,
      pageHeight
    ),
    ...mapFieldListToHighlights(
      "Address",
      "address",
      fields.address,
      words,
      pageWidth,
      pageHeight
    ),
    ...mapFieldListToHighlights(
      "Cause of Death",
      "causeOfDeath",
      fields.causeOfDeath,
      words,
      pageWidth,
      pageHeight
    ),
  ];

  return normalizeHighlights(highlights);
}

async function extractFieldsFromGemini(ocrLineText: string) {
  const fieldItemProperty = {
    name: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          coordinate: {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "number" }],
            minItems: 2,
            maxItems: 2,
          },
        },
        required: ["text", "coordinate"],
      },
    }
  };
  const response = await geminiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are extracting fields from death certificate OCR.

OCR input format is one word per line:
text:x, y
where x,y is the top-left coordinate for that OCR word.

Return JSON with these fields as lists:
- name
- dateOfBirth
- address
- causeOfDeath

Each list item must have:
- word: string (EXACTLY ONE word)
- coordinate: [x, y] for that word
Each word and coordinate must exactly match values from OCR input.
If no matches are found for a field, return [].

OCR:
${ocrLineText}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          name: fieldItemProperty,
          dateOfBirth: fieldItemProperty,
          address: fieldItemProperty,
          causeOfDeath: fieldItemProperty,
        },
        required: ["name", "dateOfBirth", "address", "causeOfDeath"],
      },
    },
  });

  if (!response.text) {
    return null;
  }
  console.log(response.text)

  const parsed = parsedFieldsSchema.safeParse(JSON.parse(response.text));
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export async function runDeathCertificatePipeline(): Promise<Highlight[]> {
  const { page, words } = getOcrWordsAndPage();
  const ocrLineText = toTopLeftOcrLines(words);
  const fields = await extractFieldsFromGemini(ocrLineText);

  if (!fields) {
    return [];
  }

  return mapFieldsToHighlights(fields, words, page.width, page.height);
}
