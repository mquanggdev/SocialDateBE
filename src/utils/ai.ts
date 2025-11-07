// utils/ai.ts
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;

if (!HUGGINGFACE_TOKEN) {
  throw new Error("HUGGINGFACE_TOKEN is missing in .env");
}

export const detectNSFW = async (buffer: Buffer): Promise<boolean> => {
  try {
    const url = `https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer), // ĐÃ SỬA LỖI TYPE
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    const nsfwItem = result.find((r: any) => r.label === "nsfw");
    const isNSFW = nsfwItem ? nsfwItem.score > 0.6 : false;

    console.log("NSFW Detection:", { isNSFW, nsfwScore: nsfwItem?.score });
    return isNSFW;
  } catch (error: any) {
    console.error("NSFW detection failed:", error.message);
    return false;
  }
};