/**
 * Builds a socket.io server URL using public environment variables when available,
 * and falls back to sensible defaults derived from the current window location.
 *
 * @returns {string} Fully qualified socket server URL including protocol and port.
 * @example
 * const socket = io(ResolveSocketUrl(), { transports: ["websocket"] });
 */
export function ResolveSocketUrl(): string {
	const explicitUrl =
		process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ||
		process.env.NEXT_PUBLIC_SOCKET_SERVER?.trim();
	if (explicitUrl) {
		return explicitUrl;
	}

	const protocol =
		process.env.NEXT_PUBLIC_SOCKET_PROTOCOL?.replace("://", "").replace(":", "") ||
		process.env.PROTOCOL?.replace("://", "").replace(":", "") ||
		(typeof window !== "undefined"
			? window.location.protocol.replace(":", "").replace("/", "")
			: "http");

	const host =
		process.env.NEXT_PUBLIC_SOCKET_HOST?.trim() ||
		process.env.NEXT_PUBLIC_HOST?.trim() ||
		process.env.SOCKET_HOST?.trim() ||
		process.env.HOST?.trim() ||
		(typeof window !== "undefined" ? window.location.hostname : "localhost");

	const port =
		process.env.NEXT_PUBLIC_SOCKET_PORT?.trim() ||
		process.env.SOCKET_PORT?.trim() ||
		"3001";

	return `${protocol}://${host}${port ? `:${port}` : ""}`;
}
