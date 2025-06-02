export async function sha256(message): Promise<string> {
	// encode as UTF-8
	const msgBuffer = new TextEncoder().encode(message);
	// hash the message
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	// convert ArrayBuffer to Array
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	// convert bytes to hex string
	const hashHex = hashArray
		.map(byte => byte.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
}

export async function fileTosha256(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();

	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
}
