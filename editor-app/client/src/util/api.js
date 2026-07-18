async function json(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  async uploadMedia(files) {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    const res = await fetch('/api/media/upload', {method: 'POST', body: form});
    return json(res);
  },
  async listMedia() {
    const res = await fetch('/api/media');
    return json(res);
  },
  async deleteMedia(id) {
    const res = await fetch(`/api/media/${id}`, {method: 'DELETE'});
    return json(res);
  },
  async listProjects() {
    const res = await fetch('/api/projects');
    return json(res);
  },
  async getProject(id) {
    const res = await fetch(`/api/projects/${id}`);
    return json(res);
  },
  async saveProject(project) {
    const method = project.id ? 'PUT' : 'POST';
    const url = project.id ? `/api/projects/${project.id}` : '/api/projects';
    const res = await fetch(url, {
      method,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(project),
    });
    return json(res);
  },
  async deleteProject(id) {
    const res = await fetch(`/api/projects/${id}`, {method: 'DELETE'});
    return json(res);
  },
  async startRender(project) {
    const res = await fetch('/api/render', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({project}),
    });
    return json(res);
  },
  async getRenderStatus(jobId) {
    const res = await fetch(`/api/render/${jobId}`);
    return json(res);
  },
  downloadUrl(jobId) {
    return `/api/render/${jobId}/download`;
  },
};
