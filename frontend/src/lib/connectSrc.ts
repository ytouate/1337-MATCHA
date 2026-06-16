function toWsOrigin(httpOrigin: string): string {
  return httpOrigin.replace(/^http/, "ws");
}

function toWssOrigin(httpOrigin: string): string {
  if (httpOrigin.startsWith("https:")) {
    return httpOrigin.replace(/^https/, "wss");
  }

  return httpOrigin.replace(/^http/, "wss");
}

function localhostVariants(httpOrigin: string): string[] {
  try {
    const url = new URL(httpOrigin);
    const origins = [httpOrigin.replace(/\/$/, "")];

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      const alt = new URL(httpOrigin);
      alt.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
      origins.push(alt.toString().replace(/\/$/, ""));
    }

    const sources = new Set<string>();
    for (const origin of origins) {
      sources.add(origin);
      sources.add(toWsOrigin(origin));
      sources.add(toWssOrigin(origin));
    }

    return [...sources];
  } catch {
    return [httpOrigin, toWsOrigin(httpOrigin), toWssOrigin(httpOrigin)];
  }
}

export function buildConnectSrcSources(options: {
  apiBase: string;
  appBase: string;
  includeLocalhostVariants?: boolean;
}): string[] {
  const { apiBase, appBase, includeLocalhostVariants = false } = options;
  const sources = new Set<string>(["'self'"]);

  for (const origin of [apiBase, appBase]) {
    const entries = includeLocalhostVariants
      ? localhostVariants(origin)
      : [origin, toWsOrigin(origin), toWssOrigin(origin)];

    for (const entry of entries) {
      sources.add(entry);
    }
  }

  return [...sources];
}

export function buildConnectSrcDirective(options: {
  apiBase: string;
  appBase: string;
  includeLocalhostVariants?: boolean;
  devMode?: boolean;
}): string {
  if (options.devMode) {
    return "connect-src 'self' http: https: ws: wss: blob: data:";
  }

  return `connect-src ${buildConnectSrcSources(options).join(" ")}`;
}
