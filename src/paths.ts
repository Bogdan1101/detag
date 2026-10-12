const base = import.meta.env.BASE_URL;

/** Keep internal routes/assets relative to the deployment root. */
export function sitePath(path: string | undefined): string | undefined {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return path;
  return base + path.slice(1);
}

export function routePath(path: string): string {
  const prefix = base.replace(/\/$/, '');
  if (prefix && (path === prefix || path.startsWith(prefix + '/'))) {
    return path.slice(prefix.length) || '/';
  }
  return path;
}

export function localHtml(value: string): string {
  return value.replace(/\b(href|src)=(['"])(\/[^'"]*)\2/g,
    (_, attribute, quote, path) => `${attribute}=${quote}${sitePath(path)}${quote}`);
}
