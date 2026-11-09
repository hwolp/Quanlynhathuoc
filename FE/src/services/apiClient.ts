/** HTTP transport for the FastAPI API. Business data is never persisted in the browser. */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export const SESSION_KEY = 'pharmacare_api_session';
export interface Session { accessToken: string; user: import('../types/pharmacy').TaiKhoan }
export function readSession(): Session | null {
  try { const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); return session?.accessToken && session?.user?.maTaiKhoan ? session : null; } catch { return null; }
}
export function saveSession(session: Session) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export function clearSession() { sessionStorage.removeItem(SESSION_KEY); }
const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  const session = readSession();
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, signal: options.signal || timeout.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.detail;
      const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((item: {loc?: string[];msg:string}) => `${item.loc?.slice(1).join('.') || 'Dữ liệu'}: ${item.msg}`).join('; ') : `Yêu cầu không thành công (${response.status}).`;
      if (response.status === 401 && path !== '/auth/login') { clearSession(); window.dispatchEvent(new Event('pharmacare:unauthorized')); }
      throw new ApiError(response.status, message);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, timeout.signal.aborted ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.' : 'Không thể kết nối backend. Kiểm tra máy chủ API và thử lại.');
  } finally { clearTimeout(timer); }
}
export function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key,value]) => { if(value !== undefined && value !== '') params.set(key,String(value)); });
  return params.size ? `?${params}` : '';
}
