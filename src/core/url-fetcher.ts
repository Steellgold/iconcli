import { isValidSVG } from "@/utils/validation";

/**
 * Fetch SVG content from URL
 */
export const fetchSVGFromURL = async (url: string, timeout: number = 10000): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "image/svg+xml, text/plain, */*",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();

    if (!isValidSVG(content)) {
      throw new Error("The fetched content is not a valid SVG");
    }

    return content;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - The server took too long to respond");
      }
      throw error;
    }

    throw new Error("Failed to fetch SVG from URL");
  }
};
