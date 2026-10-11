import crypto from "node:crypto";

export const POSTS_DIR = "src/content/posts";
export const REPO = process.env.GITHUB_REPO || "Marlobbz/blog";
export const BRANCH = process.env.GITHUB_BRANCH || "main";

export function json(res, status, data) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	res.end(JSON.stringify(data));
}

function fail(status, error, message) {
	const err = new Error(message);
	err.status = status;
	err.code = error;
	return err;
}

/**
 * Password check against the ADMIN_PASSWORD environment variable,
 * using a constant-time comparison.
 */
export function checkAuth(req) {
	const expected = process.env.ADMIN_PASSWORD || "";
	if (!expected) {
		throw fail(500, "not_configured", "环境变量 ADMIN_PASSWORD 未设置");
	}
	const provided = req.headers["x-admin-key"] || "";
	const a = Buffer.from(String(provided));
	const b = Buffer.from(expected);
	const same =
		a.length === b.length && crypto.timingSafeEqual(a, b);
	if (!same) {
		throw fail(401, "unauthorized", "管理密码错误");
	}
}

export function ghFetch(path, options = {}) {
	const token = process.env.GITHUB_TOKEN;
	if (!token) {
		throw fail(
			500,
			"not_configured",
			"环境变量 GITHUB_TOKEN 未设置",
		);
	}
	return fetch(`https://api.github.com${path}`, {
		...options,
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "blog-admin",
			...(options.headers || {}),
		},
		signal: AbortSignal.timeout(15000),
	});
}

export async function ghJson(path, options = {}) {
	const res = await ghFetch(path, options);
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			body && body.message
				? `GitHub API: ${body.message}`
				: `GitHub API 请求失败（HTTP ${res.status}）`;
		const status = res.status === 401 || res.status === 403 ? 500 : 400;
		throw fail(status, "github_error", message);
	}
	return body;
}

/**
 * Turn a post title/filename into a safe lowercase .md filename.
 */
export function sanitizeFilename(input) {
	let name = String(input || "")
		.replace(/\.(md|mdx)$/i, "")
		.normalize("NFKC")
		.trim()
		.toLowerCase()
		.replace(/[\s]+/g, "-")
		.replace(/[\\/:*?"<>|]/g, "")
		.replace(/\.{2,}/g, ".")
		.replace(/^\.+|\.+$/g, "")
		.replace(/-+/g, "-")
		.slice(0, 80);
	if (!name) {
		name = `post-${new Date().toISOString().slice(0, 10)}`;
	}
	return `${name}.md`;
}

function yamlString(value) {
	const s = String(value ?? "");
	return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Build the Fuwari post frontmatter block.
 * Field order & meaning follow src/content/config.ts.
 */
export function buildPostFile(fm, content) {
	const lines = ["---"];
	lines.push(`title: ${yamlString(fm.title)}`);
	lines.push(`published: ${fm.published}`);
	if (fm.updated) lines.push(`updated: ${fm.updated}`);
	lines.push(`description: ${yamlString(fm.description || "")}`);
	lines.push(`image: ${yamlString(fm.image || "")}`);
	const tags = Array.isArray(fm.tags) ? fm.tags.filter(Boolean) : [];
	lines.push(
		`tags: [${tags.map((t) => yamlString(t)).join(", ")}]`,
	);
	lines.push(`category: ${yamlString(fm.category || "")}`);
	lines.push(`draft: ${fm.draft ? "true" : "false"}`);
	lines.push(`lang: ${yamlString(fm.lang || "")}`);
	lines.push("---");
	const body = String(content || "").replace(/^\s+/, "");
	return `${lines.join("\n")}\n\n${body}\n`;
}

/** Run async tasks with a concurrency cap. */
export async function mapPool(items, limit, worker) {
	const results = new Array(items.length);
	let index = 0;
	async function run() {
		while (index < items.length) {
			const current = index++;
			results[current] = await worker(items[current], current);
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, run),
	);
	return results;
}
