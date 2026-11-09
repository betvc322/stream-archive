const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export async function readLimitedText(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) throw new Error("CATALOG_TOO_LARGE");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("EMPTY_UPSTREAM_RESPONSE");
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("CATALOG_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
