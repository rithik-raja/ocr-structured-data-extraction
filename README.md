### OCR+AI Pipeline

Structured data extraction using LLM poses the challenge of mitigating errors/hallucinations, especially in highly regulated fields. With image inputs, this is even more so.
This demo provides a proof of concept for a document intelligence pipeline.
- Use Azure OCR to obtain text and spatial data
- Trim and pass this data into a lightweight LLM like Gemini Flash
- Map back to original coordinates, apply grouping, and render highlights on image

![ocr-ai](https://github.com/user-attachments/assets/3550e8eb-5119-4974-8458-78d8e10c1416)
