export interface FigmaURLInfo {
  fileKey: string;
  nodeId: string;
}

/**
 * Parse a Figma URL and extract the file key and node ID.
 *
 * Supported formats:
 * - https://www.figma.com/file/{FILE_KEY}/...?node-id={X-Y}
 * - https://www.figma.com/design/{FILE_KEY}/...?node-id={X-Y}
 */
export const parseFigmaURL = (url: string): FigmaURLInfo | null => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("figma.com")) {
      return null;
    }

    // Extract file key from path: /file/{KEY}/... or /design/{KEY}/...
    const pathMatch = parsed.pathname.match(/\/(?:file|design)\/([^/]+)/);
    if (!pathMatch) {
      return null;
    }
    const fileKey = pathMatch[1];

    // Extract node-id from query params (format: "123-456" or "123:456")
    const rawNodeId = parsed.searchParams.get("node-id");
    if (!rawNodeId) {
      return null;
    }
    // Normalize separator: Figma uses both "-" and ":" depending on the URL source
    const nodeId = rawNodeId.replace(/-/g, ":");

    return { fileKey, nodeId };
  } catch {
    return null;
  }
};

/**
 * Fetch a single SVG from Figma using the REST API.
 * Requires a personal access token or OAuth token.
 */
export const fetchFigmaIcon = async (
  token: string,
  fileKey: string,
  nodeId: string
): Promise<string> => {
  // Step 1: Request an SVG export URL from the Figma API
  const exportUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=svg`;

  const exportRes = await fetch(exportUrl, {
    headers: { "X-Figma-Token": token },
  });

  if (!exportRes.ok) {
    const body = await exportRes.text().catch(() => "");
    throw new Error(`Figma API error (${exportRes.status}): ${body}`);
  }

  const exportData = (await exportRes.json()) as {
    err?: string;
    images?: Record<string, string | null>;
  };

  if (exportData.err) {
    throw new Error(`Figma export error: ${exportData.err}`);
  }

  const svgUrl = exportData.images?.[nodeId];
  if (!svgUrl) {
    throw new Error(`No SVG export URL returned for node "${nodeId}"`);
  }

  // Step 2: Fetch the actual SVG content from the export URL
  const svgRes = await fetch(svgUrl);
  if (!svgRes.ok) {
    throw new Error(`Failed to download SVG from Figma (${svgRes.status})`);
  }

  const svgContent = await svgRes.text();
  return svgContent;
};
