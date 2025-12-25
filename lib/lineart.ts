import { GoogleGenAI } from "@google/genai";
import { LineStyle } from "@/types/lineart";

const getSystemInstruction = () => {
  return `You are an expert technical illustrator specializing in converting raster images into clean, vector-ready line art. 
  Your output must be a high-contrast image consisting ONLY of black lines on a solid white background. 
  Do not include shading, gradients, colors, or watermarks. 
  The lines should be continuous and confident, suitable for packaging design or laser cutting.`;
};

const getPromptForStyle = (style: LineStyle, userPrompt: string) => {
  const basePrompt = userPrompt ? `Additional context: ${userPrompt}. ` : "";
  
  switch (style) {
    case LineStyle.MINIMAL:
      return `${basePrompt}Convert this image into a minimal, iconic line drawing. Use the fewest lines possible to capture the essence. Thick, consistent line weight. Abbreviate details.`;
    case LineStyle.DETAILED:
      return `${basePrompt}Convert this image into a detailed technical illustration. Capture fine textures with precise stippling or thin lines. Maintain accurate proportions.`;
    case LineStyle.ORGANIC:
      return `${basePrompt}Convert this image into a hand-drawn artistic sketch. Use fluid, variable-width lines that feel organic and lively.`;
    default:
      return `${basePrompt}Convert this image into a clean line art illustration.`;
  }
};

export const generateLineArt = async (
  base64Image: string, 
  style: LineStyle,
  userPrompt: string
): Promise<string> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI API KEY가 설정되지 않았습니다.');
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Extract base64 data without the prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: getPromptForStyle(style, userPrompt),
          },
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(),
      },
    });

    // Handle potential multiple parts output, looking for the image
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts) {
      throw new Error("생성된 콘텐츠가 없습니다.");
    }

    // Try to find an inline image part
    const imagePart = parts.find(p => p.inlineData);
    
    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }

    // If no image part, check if text was returned explaining why
    const textPart = parts.find(p => p.text);
    if (textPart) {
        console.warn("Gemini returned text instead of image:", textPart.text);
        throw new Error("모델이 이미지 대신 텍스트를 반환했습니다. 다른 이미지나 프롬프트를 시도해 보세요.");
    }

    throw new Error("이미지 생성에 실패했습니다.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Removes white (or near-white) background from an image.
 * This simulates a transparent PNG creation for line art.
 */
export const removeWhiteBackground = (base64Image: string, threshold: number = 240): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = base64Image;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Simple brightness calculation
        // If pixel is very bright (white), make it transparent
        if (r > threshold && g > threshold && b > threshold) {
          data[i + 3] = 0; // Alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (err) => reject(err);
  });
};

/**
 * Converts a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
