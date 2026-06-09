export async function onRequestPost({request, env}) {
  const kv = env.KV;
  const url = new URL(request.url);

  // 登录接口兼容（无密码模式）
  if (url.pathname === "/api/login") {
    return Response.json({ ok: true });
  }

  // 获取目录树（修复：自动初始化空树）
  if (url.pathname === "/api/tree") {
    let tree = await kv.get("tree", { type: "json" });
    if (!tree) {
      tree = {};
      await kv.put("tree", JSON.stringify(tree));
    }
    return Response.json({ tree });
  }

  // 新建目录（修复：确保目录创建后树结构更新）
  if (url.pathname === "/api/mkdir") {
    const { name } = await request.json();
    let tree = await kv.get("tree", { type: "json" }) || {};
    if (!tree[name]) {
      tree[name] = [];
      await kv.put("tree", JSON.stringify(tree));
    }
    return Response.json({ ok: 1 });
  }

  // 新建笔记（自动创建不存在的目录）
  if (url.pathname === "/api/new") {
    const { folder, name } = await request.json();
    let tree = await kv.get("tree", { type: "json" }) || {};
    if (!tree[folder]) {
      tree[folder] = [];
    }
    const exists = tree[folder].some(item => item.name === name);
    if (!exists) {
      tree[folder].push({ type: "note", name });
      await kv.put("tree", JSON.stringify(tree));
      await kv.put(`note:${folder}:${name}`, "");
    }
    return Response.json({ ok: 1 });
  }

  // 读取笔记
  if (url.pathname === "/api/get") {
    const { folder, name } = await request.json();
    const content = await kv.get(`note:${folder}:${name}`) || "";
    return Response.json({ content });
  }

  // 保存笔记
  if (url.pathname === "/api/save") {
    const { folder, name, content } = await request.json();
    await kv.put(`note:${folder}:${name}`, content);
    return Response.json({ ok: 1 });
  }

  // 删除笔记
  if (url.pathname === "/api/delete") {
    const { folder, name } = await request.json();
    await kv.delete(`note:${folder}:${name}`);
    let tree = await kv.get("tree", { type: "json" }) || {};
    if (tree[folder]) {
      tree[folder] = tree[folder].filter(item => item.name !== name);
      await kv.put("tree", JSON.stringify(tree));
    }
    return Response.json({ ok: 1 });
  }

  // 文件上传
  if (url.pathname === "/api/upload") {
    const form = await request.formData();
    const folder = form.get("folder");
    const file = form.get("file");
    const fileName = file.name;
    const buffer = await file.arrayBuffer();

    await kv.put(`file:${folder}:${fileName}`, buffer, {
      metadata: { name: fileName, type: file.type }
    });

    let tree = await kv.get("tree", { type: "json" }) || {};
    if (!tree[folder]) {
      tree[folder] = [];
    }
    const exists = tree[folder].some(item => item.name === fileName);
    if (!exists) {
      tree[folder].push({ type: "file", name: fileName });
      await kv.put("tree", JSON.stringify(tree));
    }
    return Response.json({ ok: 1 });
  }

  return Response.json({ ok: 0 });
}