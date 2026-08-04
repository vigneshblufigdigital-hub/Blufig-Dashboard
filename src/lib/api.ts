/**
 * Resolves the correct API URL prefix by applying the application's base path.
 * In development/preview, it routes to "/" (root), while in production under the reverse proxy,
 * it routes to "/BluOps/" (or any custom base URL set via VITE_BASE_URL).
 */
export function getApiUrl(path: string): string {
  // Strip leading slash to prevent double-slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Retrieve the base URL configured in Vite (which defaults to '/BluOps/' in production mode)
  let base = import.meta.env.BASE_URL || '/';
  
  // Ensure base has a trailing slash
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  
  return `${cleanBase}${cleanPath}`;
}

/**
 * Safely stringifies an object to JSON, handling potential circular structures gracefully.
 */
export function safeStringify(value: any, space?: number | string): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) {
          return "[CircularReference]";
        }
        seen.add(val);
      }
      if (typeof val === "bigint") {
        return val.toString();
      }
      return val;
    }, space);
  } catch (err: any) {
    return JSON.stringify({ error: `Serialization failed: ${err?.message || 'unknown circular structure'}` });
  }
}

/**
 * Safely requests and parses a fetch response, resolving with JSON or throwing a user-friendly error.
 * Catches network failures, HTML-based error pages, and bad gateway JSON parsing exceptions.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Connection failed. Please verify that your backend server is responsive.`);
  }

  const rawText = await response.text();
  let parsedJson: any = null;
  let isJson = false;

  try {
    if (rawText && rawText.trim()) {
      parsedJson = JSON.parse(rawText);
      isJson = true;
    }
  } catch (parseErr) {
    isJson = false;
  }

  if (!response.ok) {
    // If backend returned a JSON error payload, prioritize it
    if (isJson && parsedJson && (parsedJson.error || parsedJson.message)) {
      throw new Error(parsedJson.error || parsedJson.message);
    }
    // Friendly fallback errors based on typical HTTP codes
    if (response.status === 404) {
      throw new Error("The requested API endpoint was not found (Status 404).");
    }
    if (response.status === 500) {
      throw new Error("The server encountered an error (Status 500). Please check your SMTP settings or server logs.");
    }
    throw new Error(`Server responded with error status ${response.status}.`);
  }

  if (!isJson) {
    throw new Error("The server returned an invalid non-JSON response format.");
  }

  return parsedJson;
}
