import matter from "gray-matter";
import {
	BRANCH,
	POSTS_DIR,
	REPO,
	buildPostFile,
	checkAuth,
	ghJson,
	json,
	mapPool,
	sanitizeFilename,
} from "./_lib.js";

export const maxDuration = 60;

function normalizePost(path, sha, content) {
	const parsed = matter(content);
	const data = parsed.data || {};
	return {
		path,
		sha,
		filename: path.split("/").pop(),
		title: data.title || "",
		published: data.published
			? new Date(data.published).toISOString().slice(0, 10)
			: "",
		updated: data.updated
			? new Date(data.updated).toISOString().slice(0, 10)
			: "",
		description: data.description || "",
		image: data.image || "",
		tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
		category: data.category ? String(data.category) : "",
		draft: Boolean(data.draft),
		lang: data.lang || "",
		content: parsed.content.replace(/^\s*\n/, ""),
	};
}

/** GET /api/posts — list all posts with metadata */
async function listPosts(res) {
	const tree = await ghJson(
		`/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
	);
	const files = (tree.tree || []).filter(
		(item) =>
			item.type === "blob" &&
			item.path.startsWith(`${POSTS_DIR}/`) &&
			/\.(md|mdx)$/i.test(item.path),
	);
	const posts = await mapPool(files, 6, async (item) => {
		try {
			const file = await ghJson(
				`/repos/${REPO}/contents/${encodeURIComponent(item.path)}?ref=${BRANCH}`,
			);
			if (file.encoding !== "base64" || typeof file.content !== "string") {
				return null;
			}
			const content = Buffer.from(file.content, "base64").toString("utf8");
			return normalizePost(item.path, file.sha, content);
		} catch {
			return null;
		}
	});
	const valid = posts
		.filter(Boolean)
		.sort((a, b) => (a.published < b.published ? 1 : -1));
	return json(res, 200, { ok: true, posts: valid });
}

/** POST /api/posts — create or update a post */
async function savePost(req, res) {
	const body = req.body || {};
	const {
		filename,
		title,
		published,
		updated,
		description,
		image,
		tags,
		category,
		draft,
		lang,
		content,
		editPath,
		editSha,
	} = body;

	if (!title || typeof title !== "string") {
		return json(res, 400, {
			error: "bad_request",
			message: "文章标题不能为空",
		});
	}
	const safeName = sanitizeFilename(filename || title);
	const newPath = `${POSTS_DIR}/${safeName}`;
	const fileContent = buildPostFile(
		{ title, published, updated, description, image, tags, category, draft, lang },
		content,
	);

	const isRename =
		typeof editPath === "string" &&
		editPath.length > 0 &&
		editPath !== newPath;

	// refuse to silently overwrite an unrelated existing file
	if (!editPath) {
		try {
			await ghJson(
				`/repos/${REPO}/contents/${encodeURIComponent(newPath)}?ref=${BRANCH}`,
			);
			return json(res, 409, {
				error: "conflict",
				message: `文件 ${safeName} 已存在，请修改标题或文件名`,
			});
		} catch {
			// 404 means the name is free — expected
		}
	}

	const put = await ghJson(
		`/repos/${REPO}/contents/${encodeURIComponent(newPath)}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message: isRename
					? `post: rename ${editPath.split("/").pop()} -> ${safeName}`
					: `post: ${editPath ? "update" : "create"} ${safeName}`,
				content: Buffer.from(fileContent, "utf8").toString("base64"),
				branch: BRANCH,
				...(editPath && !isRename && editSha ? { sha: editSha } : {}),
			}),
		},
	);

	if (isRename && editSha) {
		await ghJson(
			`/repos/${REPO}/contents/${encodeURIComponent(editPath)}`,
			{
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: `post: remove old file ${editPath.split("/").pop()}`,
					sha: editSha,
					branch: BRANCH,
				}),
			},
		);
	}

	return json(res, 200, {
		ok: true,
		path: newPath,
		commit: put && put.commit ? put.commit.sha : "",
		message: "文章已提交，Vercel 正在部署，约 1-2 分钟后生效",
	});
}

/** DELETE /api/posts — delete a post file */
async function deletePost(req, res) {
	const body = req.body || {};
	const { path: postPath, sha } = body;
	if (
		typeof postPath !== "string" ||
		!postPath.startsWith(`${POSTS_DIR}/`) ||
		postPath.includes("..")
	) {
		return json(res, 400, {
			error: "bad_request",
			message: "非法的文件路径",
		});
	}
	await ghJson(`/repos/${REPO}/contents/${encodeURIComponent(postPath)}`, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			message: `post: delete ${postPath.split("/").pop()}`,
			sha,
			branch: BRANCH,
		}),
	});
	return json(res, 200, {
		ok: true,
		message: "文章已删除，Vercel 正在部署，约 1-2 分钟后生效",
	});
}

export default async function handler(req, res) {
	try {
		checkAuth(req);
	} catch (err) {
		return json(res, err.status || 401, {
			error: err.code || "unauthorized",
			message: err.message,
		});
	}

	try {
		if (req.method === "GET") return await listPosts(res);
		if (req.method === "POST") return await savePost(req, res);
		if (req.method === "DELETE") return await deletePost(req, res);
		return json(res, 405, { error: "method_not_allowed", message: "不支持的请求方法" });
	} catch (err) {
		return json(res, err.status || 500, {
			error: err.code || "server_error",
			message: err.message || "服务器内部错误",
		});
	}
}
