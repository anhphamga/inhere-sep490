import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import "./AdminBlogsPage.css";

const emptyForm = {
  title: "",
  slug: "",
  thumbnail: "",
  category: "",
  status: "draft",
  likeCount: 0,
  viewCount: 0,
  content: "",
};

const readFilesAsDataUrls = (files) =>
  Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );

export default function AdminBlogsPage() {
  const [lang, setLang] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("lang") || "vi" : "vi"
  );
  const [blogs, setBlogs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState("");
  const [isThumbDragOver, setIsThumbDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const isEditing = Boolean(selectedId);

  const loadBlogs = async () => {
    const res = await fetch("/api/blogs?scope=all");
    const data = res.ok ? await res.json() : { data: [] };
    const list = Array.isArray(data?.data) ? data.data : [];
    setBlogs(list);
    return list;
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectedBlog = useMemo(
    () => blogs.find((b) => b._id === selectedId) || null,
    [blogs, selectedId]
  );

  const startCreate = () => {
    setSelectedId("");
    setForm(emptyForm);
    setStatusMessage("");
    setThumbnailUrlInput("");
  };

  const startEdit = async (id) => {
    setSelectedId(id);
    setStatusMessage("");
    const res = await fetch(`/api/blogs/${id}`);
    const data = res.ok ? await res.json() : { data: null };
    const blog = data?.data;
    if (!blog) return;
    setForm({
      title: blog.title || "",
      slug: blog.slug || "",
      thumbnail: blog.thumbnail || "",
      category: blog.category || "",
      status: blog.status || "draft",
      likeCount: Number(blog.likeCount || 0),
      viewCount: Number(blog.viewCount || 0),
      content: blog.content || "",
    });
    setThumbnailUrlInput("");
  };

  const setThumbnailFromUrl = (url) => {
    const clean = String(url || "").trim();
    if (!clean) return;
    setField("thumbnail", clean);
  };

  const onChooseThumbnailFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const dataUrls = await readFilesAsDataUrls(files);
    if (dataUrls.length > 0) {
      setField("thumbnail", String(dataUrls[0]));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onThumbnailDrop = async (event) => {
    event.preventDefault();
    setIsThumbDragOver(false);
    const files = Array.from(event.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) return;
    const dataUrls = await readFilesAsDataUrls(files);
    if (dataUrls.length > 0) {
      setField("thumbnail", String(dataUrls[0]));
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await loadBlogs();
      if (!mounted || list.length === 0) return;
      await startEdit(list[0]._id);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveBlog = async () => {
    try {
      setSaving(true);
      setStatusMessage("");
      const payload = {
        ...form,
        status: String(form.status || "draft").toLowerCase(),
        likeCount: Number(form.likeCount || 0),
        viewCount: Number(form.viewCount || 0),
      };

      const res = await fetch(isEditing ? `/api/blogs/${selectedId}` : "/api/blogs", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");

      const list = await loadBlogs();
      const id = data?.data?._id || selectedId;
      if (id) {
        const exists = list.find((b) => b._id === id);
        if (exists) await startEdit(id);
      }
      setStatusMessage(isEditing ? "Updated blog successfully." : "Created blog successfully.");
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBlog = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Delete this blog?");
    if (!ok) return;
    try {
      setSaving(true);
      setStatusMessage("");
      const res = await fetch(`/api/blogs/${selectedId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      await loadBlogs();
      startCreate();
      setStatusMessage("Deleted blog successfully.");
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-blogs-page">
      <Header active="" lang={lang} setLang={setLang} />
      <main className="admin-blogs-shell">
        <aside className="admin-blogs-sidebar">
          <div className="admin-blogs-sidebar-head">
            <h2>Blogs</h2>
            <button type="button" onClick={startCreate}>
              + New
            </button>
          </div>
          <div className="admin-blogs-list">
            {blogs.map((blog) => (
              <button
                key={blog._id}
                className={`admin-blog-item ${selectedId === blog._id ? "active" : ""}`}
                onClick={() => startEdit(blog._id)}
                type="button"
              >
                <strong>{blog.title || "(No title)"}</strong>
                <span>{blog.status || "draft"}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-blogs-editor">
          <div className="admin-blogs-editor-head">
            <h1>{isEditing ? `Edit: ${selectedBlog?.title || ""}` : "Create New Blog"}</h1>
            <div className="admin-blogs-actions">
              {isEditing && (
                <button className="danger" type="button" onClick={deleteBlog} disabled={saving}>
                  Delete
                </button>
              )}
              <button type="button" onClick={saveBlog} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="admin-blogs-form-grid">
            <label>
              Title
              <input value={form.title} onChange={(e) => setField("title", e.target.value)} />
            </label>
            <label>
              Slug
              <input value={form.slug} onChange={(e) => setField("slug", e.target.value)} />
            </label>
            <label>
              Thumbnail URL
              <input
                value={form.thumbnail}
                onChange={(e) => setField("thumbnail", e.target.value)}
              />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(e) => setField("category", e.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </label>
            <label>
              Like Count
              <input
                type="number"
                value={form.likeCount}
                onChange={(e) => setField("likeCount", e.target.value)}
              />
            </label>
            <label>
              View Count
              <input
                type="number"
                value={form.viewCount}
                onChange={(e) => setField("viewCount", e.target.value)}
              />
            </label>
          </div>

          <div
            className={`blog-thumb-dropzone ${isThumbDragOver ? "drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsThumbDragOver(true);
            }}
            onDragLeave={() => setIsThumbDragOver(false)}
            onDrop={onThumbnailDrop}
          >
            <p>Kéo thả ảnh thumbnail vào đây</p>
            <p>hoặc</p>
            <div className="blog-thumb-dropzone-actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Chọn ảnh từ máy
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={onChooseThumbnailFiles}
              />
            </div>
          </div>

          <div className="blog-thumb-url-adder">
            <input
              value={thumbnailUrlInput}
              onChange={(e) => setThumbnailUrlInput(e.target.value)}
              placeholder="Dán URL ảnh và bấm Thêm URL"
            />
            <button
              type="button"
              onClick={() => {
                setThumbnailFromUrl(thumbnailUrlInput);
                setThumbnailUrlInput("");
              }}
            >
              Thêm URL
            </button>
          </div>

          {form.thumbnail ? (
            <div className="blog-thumb-preview">
              <img src={form.thumbnail} alt="thumbnail-preview" />
              <button type="button" onClick={() => setField("thumbnail", "")}>
                Xóa ảnh
              </button>
            </div>
          ) : null}

          <label className="admin-blogs-content">
            Content
            <textarea
              rows={14}
              value={form.content}
              onChange={(e) => setField("content", e.target.value)}
            />
          </label>

          {statusMessage && <p className="admin-blogs-status">{statusMessage}</p>}
        </section>
      </main>
    </div>
  );
}
