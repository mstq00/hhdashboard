import { GoogleGenAI } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data-URL declaration (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateThumbnailScene = async (
  mainImages: File[],
  bgImages: File[],
  refImages: File[],
  userPrompt: string,
  aspectRatio: "16:9" | "9:16" = "16:9"
): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI API KEY가 설정되지 않았습니다.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Helper to create image parts
  const filesToParts = async (files: File[]) => {
    return Promise.all(
      files.map(async (file) => ({
        inlineData: {
          mimeType: file.type,
          data: await fileToBase64(file),
        },
      }))
    );
  };

  const mainImageParts = await filesToParts(mainImages);
  const bgImageParts = await filesToParts(bgImages);
  const refImageParts = await filesToParts(refImages);

  const mainPrompt = `
    Create a high-quality, eye-catching YouTube thumbnail BACKGROUND scene.
    
    ATMOSPHERE: "${userPrompt ? userPrompt : "Natural, bright, inviting Korean vlog style, Hyper-realistic"}"

    STRICT CONSTRAINT: 
    - NO TEXT, NO LOGOS, NO WATERMARKS. 
    - Pure photography/scene only.

    Scene Description:
    - Subject: Use the images labeled 'MAIN SUBJECT' as the hero object(s). Place them prominently.
    - Props: Use 'BACKGROUND/PROP' images as supporting props if provided.
    - Composition: Professional product photography or vlog style.
    - Orientation: ${aspectRatio === "16:9" ? "Landscape" : "Portrait"}.
  `;

  const refInstruction = refImages.length > 0
    ? `
      REFERENCE INSTRUCTION (CRITICAL):
      - The images labeled 'STRUCTURAL REFERENCE' are for COMPOSITION AND LAYOUT ONLY.
      - COPY the camera angle, object placement, perspective, and lighting direction from the reference.
      - DO NOT COPY the specific objects, people, or actual visual content from the reference.
      - The final image must contain the 'MAIN SUBJECT' arranged in the structure of the 'STRUCTURAL REFERENCE'.
    `
    : "";

  // Constructing parts with explicit separators to guide the model
  const allParts = [
    { text: "INSTRUCTIONS: " + mainPrompt + refInstruction },

    { text: "--- [START] MAIN SUBJECT IMAGES (Use these actual objects in the scene) ---" },
    ...mainImageParts,

    ...(bgImageParts.length > 0 ? [
      { text: "--- [START] BACKGROUND/PROP IMAGES (Use these for decoration) ---" },
      ...bgImageParts
    ] : []),

    ...(refImageParts.length > 0 ? [
      { text: "--- [START] STRUCTURAL REFERENCE IMAGES (Use ONLY for layout/composition. DO NOT RENDER THESE OBJECTS.) ---" },
      ...refImageParts
    ] : [])
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: allParts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "2K",
        },
      } as any,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("이미지가 생성되지 않았습니다.");
  } catch (error) {
    console.error("Gemini 생성 오류:", error);
    throw error;
  }
};

export const editImageWithMask = async (
  originalImageBase64: string,
  maskImageBase64: string,
  editPrompt: string
): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI API KEY가 설정되지 않았습니다.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Clean base64 strings if they have headers
  const cleanOriginal = originalImageBase64.includes(',') ? originalImageBase64.split(',')[1] : originalImageBase64;
  const cleanMask = maskImageBase64.includes(',') ? maskImageBase64.split(',')[1] : maskImageBase64;

  const prompt = `
    Edit the first image provided.
    
    INSTRUCTION: ${editPrompt}
    
    CONSTRAINT:
    - The second image provided is a MASK (black background, white shape).
    - ONLY apply changes to the area highlighted by the white shape in the mask.
    - Keep the rest of the image exactly the same.
    - Maintain high resolution and photorealism.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: cleanOriginal } },
          { inlineData: { mimeType: 'image/png', data: cleanMask } }
        ],
      },
      config: {
        imageConfig: {
          imageSize: "2K",
        },
      } as any,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("편집된 이미지가 생성되지 않았습니다.");
  } catch (error) {
    console.error("Gemini 편집 오류:", error);
    throw error;
  }
};

export const resizeImage = async (
  originalImageBase64: string,
  targetAspectRatio: "16:9" | "9:16"
): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI API KEY가 설정되지 않았습니다.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const cleanOriginal = originalImageBase64.includes(',') ? originalImageBase64.split(',')[1] : originalImageBase64;

  const prompt = `
    Adapt the provided image to a ${targetAspectRatio === "16:9" ? "16:9 Landscape" : "9:16 Portrait"} aspect ratio.
    
    INSTRUCTIONS:
    - Keep the main subject and composition intact.
    - If expanding (outpainting), generate natural background extensions that match the style.
    - If cropping, ensure the main subject remains centered and visible.
    - Do not add text or logos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: cleanOriginal } }
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: targetAspectRatio,
          imageSize: "2K",
        },
      } as any,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("리사이즈된 이미지가 생성되지 않았습니다.");
  } catch (error) {
    console.error("Gemini 리사이즈 오류:", error);
    throw error;
  }
};

