import { CollectionBeforeChangeHook } from "payload";
import sharp from "sharp";

export const generateBlurData: CollectionBeforeChangeHook = async ({
  data,
  req,
}) => {
  if (req.file && req.file.data && data.mimeType.startsWith("image/")) {
    try {
      const buffer = await sharp(req.file.data)
        .resize(20, null, { kernel: "lanczos3" })
        .toBuffer();

      const blurData = `data:image/png;base64,${buffer.toString("base64")}`;

      return { ...data, blurData: blurData };
    } catch (error) {
      console.error("Error generating blurDataURL with sharp:", error);
    }
  }

  return data;
};
