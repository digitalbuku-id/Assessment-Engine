import PptxGenJS from "pptxgenjs";

/**
 * Export data to a PowerPoint presentation using PptxGenJS.
 *
 * @param {Array<Object>} slidesData - Array of slide definitions. Each object may contain:
 *   - title: string (optional) – Title text for the slide.
 *   - content: string (optional) – Body text for the slide.
 *   - image: string (optional) – Base64 image data or URL to be added to the slide.
 *   - notes: string (optional) – Slide notes.
 * @param {string} [fileName="export.pptx"] - Desired filename for the generated PPTX.
 * @returns {Promise<void>} Resolves when the file has been written.
 */
export async function exportToPptx(slidesData, fileName = "export.pptx") {
  const pptx = new PptxGenJS();

  // Iterate over provided slide definitions and add them to the presentation.
  slidesData.forEach((slideInfo) => {
    const slide = pptx.addSlide();

    // Title (if provided)
    if (slideInfo.title) {
      slide.addText(slideInfo.title, {
        x: 0.5,
        y: 0.3,
        fontSize: 24,
        bold: true,
        color: "363636",
      });
    }

    // Body content (if provided)
    if (slideInfo.content) {
      slide.addText(slideInfo.content, {
        x: 0.5,
        y: 1.2,
        fontSize: 18,
        color: "363636",
        margin: 0.1,
        lineSpacing: 120,
      });
    }

    // Image (if provided)
    if (slideInfo.image) {
      // PptxGenJS supports both base64 strings and image URLs.
      slide.addImage({
        data: slideInfo.image,
        x: 0.5,
        y: 2.5,
        w: 6,
        h: 4,
        sizing: { type: "contain", w: 6, h: 4 },
      });
    }

    // Notes (if provided)
    if (slideInfo.notes) {
      slide.addNotes(slideInfo.notes);
    }
  });

  // Write the PPTX file to disk. The library returns a promise.
  await pptx.writeFile({ fileName });
}

// Example usage (commented out for production):
// const slides = [
//   { title: "Welcome", content: "Introduction to the report" },
//   { title: "Data Overview", content: "Key metrics...", image: "data:image/png;base64,..." },
// ];
// exportToPptx(slides, "assessment.pptx");
