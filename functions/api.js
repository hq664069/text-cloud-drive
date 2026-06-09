export async function onRequestPost({request, env}) {
  const kv = env.KV
  const url = new URL(request.url)

  if (url.pathname === "/api/login") {
    const {pwd} = await request.json()
    const ok = pwd === env.SECRET_PASSWORD
    return Response.json({ok})
  }

  if (url.pathname === "/api/tree") {
    const tree = await kv.get("tree", {type:"json"}) || {}
    return Response.json({tree})
  }

  if (url.pathname === "/api/mkdir") {
    const {name} = await request.json()
    const tree = await kv.get("tree", {type:"json"}) || {}
    tree[name] = tree[name] || []
    await kv.put("tree", JSON.stringify(tree))
    return Response.json({ok:1})
  }

  if (url.pathname === "/api/new") {
    const {folder, name} = await request.json()
    const tree = await kv.get("tree", {type:"json"}) || {}
    tree[folder] = tree[folder] || []
    const has = tree[folder].some(i => i.name === name)
    if (!has) {
      tree[folder].push({type:"note", name})
    }
    await kv.put("tree", JSON.stringify(tree))
    await kv.put(`note:${folder}:${name}`, "")
    return Response.json({ok:1})
  }

  if (url.pathname === "/api/get") {
    const {folder, name} = await request.json()
    const c = await kv.get(`note:${folder}:${name}`)
    return Response.json({content:c})
    }

  if (url.pathname === "/api/save") {
    const {folder, name, content} = await request.json()
    await kv.put(`note:${folder}:${name}`, content)
    return Response.json({ok:1})
  }

  if (url.pathname === "/api/delete") {
    const {folder, name} = await request.json()
    await kv.delete(`note:${folder}:${name}`)
    const tree = await kv.get("tree", {type:"json"}) || {}
    if (tree[folder]) {
      tree[folder] = tree[folder].filter(i => i.name !== name)
      await kv.put("tree", JSON.stringify(tree))
    }
    return Response.json({ok:1})
  }

  if (url.pathname === "/api/upload") {
    const form = await request.formData()
    const folder = form.get("folder")
    const file = form.get("file")
    const fileName = file.name
    const buffer = await file.arrayBuffer()
    await kv.put(`file:${folder}:${fileName}`, buffer, {
      metadata:{name:fileName, type:file.type}
    })
    const tree = await kv.get("tree", {type:"json"}) || {}
    tree[folder] = tree[folder] || []
    const has = tree[folder].some(i => i.name === fileName)
    if (!has) {
      tree[folder].push({type:"file", name:fileName})
    }
    await kv.put("tree", JSON.stringify(tree))
    return Response.json({ok:1})
  }

  return Response.json({ok:0})
}
