import {conf} from "Settings";

const uploadSvgDirectly = async (
  blob: Blob,
  accessToken: string | null,
  boardId: string,
): Promise<string> => {
  const response = await fetch(`/api/v1/media/svg/${boardId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/svg+xml',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: blob,
  });

  if (!response.ok) {
    conf.hooks.onUploadMediaError(response, 'image');
    throw new Error(`Failed to upload SVG. Status: ${response.status}`);
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error("Server did not provide a key for the uploaded SVG.");
  }

  return data.url;
};

const uploadWithPresignedUrl = async (
  blob: Blob,
  accessToken: string | null,
  boardId: string,
  type: "video" | "audio" | "image",
): Promise<string> => {
  const generateUrlResponse = await fetch(`/api/v1/media/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      fileSize: blob.size,
      fileType: blob.type,
      boardId: boardId,
    }),
  });

  if (!generateUrlResponse.ok) {
    conf.hooks.onUploadMediaError(generateUrlResponse, type);
    throw new Error(`Failed to get presigned URL. Status: ${generateUrlResponse.status}`);
  }

  const data = await generateUrlResponse.json();
  const { uploadUrl, url } = data;

  if (!uploadUrl || !url) {
    throw new Error("Server did not provide an uploadUrl or key in the response.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': blob.type,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    console.error('Direct upload to storage failed:', uploadResponse.status, uploadResponse.statusText);
    throw new Error(`Direct upload to storage failed. Status: ${uploadResponse.status}`);
  }

  return url;
};

export const uploadMediaToStorage = async (
  blob: Blob,
  accessToken: string | null,
  boardId: string,
  type: "video" | "audio" | "image",
): Promise<string> => {
  try {
    if (blob.type === 'image/svg+xml') {
      return await uploadSvgDirectly(blob, accessToken, boardId);
    } else {
      return await uploadWithPresignedUrl(blob, accessToken, boardId, type);
    }
  } catch (error) {
    console.error('Media upload process error:', error);
    throw error;
  }
};

function getAccessTypeFromUrl(url: string) {
  try {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;

    const parts = pathname.split('/').filter(part => part.length > 0);

    if (parts.length > 2) {
      return parts[2];
    }
  } catch (error) {
    const parts = url.split('/');
    if (parts.length > 2 && parts[0] === 'v1') {
      return parts[2];
    }
  }

  return null;
}

export const getMediaSignedUrl = async (url: string, accessToken: string): Promise<string | null> => {
  const accessType = getAccessTypeFromUrl(url);
  if (!accessType) {
    //TODO support old urls
    return null;
  }

  if (accessType === "anonymous") {
    return url;
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get media signed url:', response.status, response.statusText);
      return null;
    }

    return response.url;
  } catch (error) {
    console.error("Error resolving redirect URL:", error);
    return null;
  }
}
