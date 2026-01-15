export interface BatchRequest {
  method: string;
  url: string; // Relative path, e.g. /calendar/v3/calendars/primary/events
  body?: unknown;
  contentId?: string;
}

export function createBatchBody(requests: BatchRequest[], boundary: string = `batch_${Date.now()}_${Math.random().toString(36).substring(2)}`) {
  const parts = requests.map((req, index) => {
    const contentId = req.contentId || `item${index}`;
    let part = `--${boundary}\r\n`;
    part += `Content-Type: application/http\r\n`;
    part += `Content-ID: ${contentId}\r\n\r\n`;

    part += `${req.method} ${req.url} HTTP/1.1\r\n`;
    if (req.body) {
      const jsonBody = JSON.stringify(req.body);
      const byteLength = new TextEncoder().encode(jsonBody).length;
      part += `Content-Type: application/json\r\n`;
      part += `Content-Length: ${byteLength}\r\n\r\n`;
      part += jsonBody;
      part += `\r\n`;
    } else {
        part += `\r\n`;
    }

    return part;
  });

  const body = parts.join('') + `--${boundary}--`;
  return { body, boundary };
}
