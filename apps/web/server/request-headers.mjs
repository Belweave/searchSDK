// Vercel adds routing, tracing and security headers before invoking a function.
// Bound the complete envelope, including those fields, without trusting any
// forwarded identity/host header or relaxing semantic header validation.
// https://vercel.com/docs/errors/request_header_too_large
export const requestHeaderLimits = Object.freeze({ totalBytes: 32768, fieldBytes: 16384, fields: 128 });
export function withinHeaderLimits(rawHeaders) {
  if (rawHeaders.length > requestHeaderLimits.fields * 2) return false;
  let total = 0;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const size = Buffer.byteLength(rawHeaders[index]) + Buffer.byteLength(rawHeaders[index + 1]);
    if (size > requestHeaderLimits.fieldBytes) return false;
    total += size;
    if (total > requestHeaderLimits.totalBytes) return false;
  }
  return true;
}
