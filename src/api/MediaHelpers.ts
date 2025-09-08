import {conf} from "Settings";

export const uploadMediaToStorage = async (
  hash: string,
  videoBlob: Blob,
  accessToken: string | null,
  boardId: string,
  type: "video" | "audio" | "image",
): Promise<string> => {
  try {
    const generateUrlResponse = await fetch(`${window.location.origin}/api/v1/media/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Отправляем JSON, а не файл
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fileSize: videoBlob.size,
        boardId: boardId,
        hash: hash,
      }),
    });

    if (!generateUrlResponse.ok) {
      conf.hooks.onUploadMediaError(generateUrlResponse, type);
      throw new Error(`Failed to get presigned URL. Status: ${generateUrlResponse.status}`);
    }

    const data = await generateUrlResponse.json();

    if (data.mediaUrl) {
      console.log("Media already exists, skipping upload.");
      return data.mediaUrl;
    }

    const { uploadUrl, promisedMediaUrl } = data;

    if (!uploadUrl || !promisedMediaUrl) {
      throw new Error("Server did not provide an uploadUrl or promisedMediaUrl in the response.");
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoBlob.type,
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      console.error('Direct upload to storage failed:', uploadResponse.status, uploadResponse.statusText);
      throw new Error(`Direct upload to storage failed. Status: ${uploadResponse.status}`);
    }

    return promisedMediaUrl;

  } catch (error) {
    console.error('Media upload process error:', error);
    throw error;
  }
};
