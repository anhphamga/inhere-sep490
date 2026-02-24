import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import "./AdminProductsPage.css";

const emptyForm = {
  name: "",
  category: "",
  size: "",
  color: "",
  baseRentPrice: 0,
  baseSalePrice: 0,
  description: "",
  images: [],
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

export default function AdminProductsPage() {
  const [lang, setLang] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("lang") || "vi" : "vi"
  );
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

  const isEditing = Boolean(selectedId);

  const loadProducts = async () => {
    const res = await fetch("/api/products?limit=200&page=1");
    const data = res.ok ? await res.json() : { data: [] };
    const list = Array.isArray(data?.data) ? data.data : [];
    setProducts(list);
    return list;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await loadProducts();
      if (!mounted) return;
      if (list.length > 0) {
        const first = list[0];
        setSelectedId(first._id);
        setForm({
          name: first.name || "",
          category: first.category || "",
          size: first.size || "",
          color: first.color || "",
          baseRentPrice: Number(first.baseRentPrice || 0),
          baseSalePrice: Number(first.baseSalePrice || 0),
          description: first.description || "",
          images: Array.isArray(first.images)
            ? first.images
            : first.imageUrl
            ? [first.imageUrl]
            : [],
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedId) || null,
    [products, selectedId]
  );

  const startCreate = () => {
    setSelectedId("");
    setForm(emptyForm);
    setStatus("");
  };

  const startEdit = async (id) => {
    setSelectedId(id);
    setStatus("");
    const res = await fetch(`/api/products/${id}`);
    const data = res.ok ? await res.json() : { data: null };
    const p = data?.data;
    if (!p) return;
    setForm({
      name: p.name || "",
      category: p.category || "",
      size: p.size || "",
      color: p.color || "",
      baseRentPrice: Number(p.baseRentPrice || 0),
      baseSalePrice: Number(p.baseSalePrice || 0),
      description: p.description || "",
      images: Array.isArray(p.images) ? p.images : [],
    });
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addImageUrls = (urls) => {
    const clean = urls.map((u) => String(u || "").trim()).filter(Boolean);
    if (clean.length === 0) return;
    setForm((prev) => ({
      ...prev,
      images: [...new Set([...(prev.images || []), ...clean])],
    }));
  };

  const onDropFiles = async (files) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const dataUrls = await readFilesAsDataUrls(imageFiles);
    addImageUrls(dataUrls);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    await onDropFiles(files);
  };

  const onChooseFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    await onDropFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  const moveImage = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    setForm((prev) => {
      const next = [...(prev.images || [])];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= next.length ||
        toIndex >= next.length
      ) {
        return prev;
      }
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, images: next };
    });
  };

  const saveProduct = async () => {
    try {
      setSaving(true);
      setStatus("");
      const payload = {
        ...form,
        baseRentPrice: Number(form.baseRentPrice || 0),
        baseSalePrice: Number(form.baseSalePrice || 0),
      };
      const res = await fetch(isEditing ? `/api/products/${selectedId}` : "/api/products", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");
      const list = await loadProducts();
      const id = data?.data?._id || selectedId;
      if (id) {
        const exists = list.find((p) => p._id === id);
        if (exists) await startEdit(id);
      }
      setStatus(isEditing ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm mới.");
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Xóa sản phẩm này?");
    if (!ok) return;
    try {
      setSaving(true);
      setStatus("");
      const res = await fetch(`/api/products/${selectedId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      await loadProducts();
      startCreate();
      setStatus("Đã xóa sản phẩm.");
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-products-page">
      <Header active="" lang={lang} setLang={setLang} />
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head">
            <h2>Sản phẩm</h2>
            <button type="button" onClick={startCreate}>
              + Tạo mới
            </button>
          </div>
          <div className="admin-product-list">
            {products.map((p) => (
              <button
                key={p._id}
                className={`admin-product-item ${selectedId === p._id ? "active" : ""}`}
                onClick={() => startEdit(p._id)}
                type="button"
              >
                <strong>{p.name}</strong>
                <span>{p.category}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-editor">
          <div className="admin-editor-head">
            <h1>{isEditing ? `Chỉnh sửa: ${selectedProduct?.name || ""}` : "Tạo sản phẩm mới"}</h1>
            <div className="admin-actions">
              {isEditing && (
                <button className="danger" type="button" onClick={deleteProduct} disabled={saving}>
                  Xóa
                </button>
              )}
              <button type="button" onClick={saveProduct} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Tên sản phẩm
              <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </label>
            <label>
              Danh mục
              <input value={form.category} onChange={(e) => setField("category", e.target.value)} />
            </label>
            <label>
              Size
              <input value={form.size} onChange={(e) => setField("size", e.target.value)} />
            </label>
            <label>
              Màu
              <input value={form.color} onChange={(e) => setField("color", e.target.value)} />
            </label>
            <label>
              Giá thuê
              <input
                type="number"
                value={form.baseRentPrice}
                onChange={(e) => setField("baseRentPrice", e.target.value)}
              />
            </label>
            <label>
              Giá bán
              <input
                type="number"
                value={form.baseSalePrice}
                onChange={(e) => setField("baseSalePrice", e.target.value)}
              />
            </label>
          </div>

          <label className="admin-description">
            Mô tả
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </label>

          <div
            className={`image-dropzone ${isDragOver ? "drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
          >
            <p>Kéo thả ảnh vào đây</p>
            <p>hoặc</p>
            <div className="image-dropzone-actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Chọn ảnh từ máy
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={onChooseFiles}
              />
            </div>
          </div>

          <div className="image-url-adder">
            <input
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Dán URL ảnh và bấm Thêm URL"
            />
            <button
              type="button"
              onClick={() => {
                addImageUrls([imageUrlInput]);
                setImageUrlInput("");
              }}
            >
              Thêm URL
            </button>
          </div>

          <div className="image-preview-grid">
            {(form.images || []).map((img, idx) => (
              <div
                key={`${img.slice(0, 24)}-${idx}`}
                className={`image-preview-item ${
                  dragOverIndex === idx ? "drag-over" : ""
                } ${dragIndex === idx ? "dragging" : ""}`}
                draggable
                onDragStart={() => {
                  setDragIndex(idx);
                  setDragOverIndex(idx);
                }}
                onDragEnter={() => {
                  if (dragIndex == null) return;
                  setDragOverIndex(idx);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  moveImage(dragIndex, idx);
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
              >
                <img src={img} alt={`img-${idx}`} />
                {idx === 0 && <span className="cover-badge">Ảnh đại diện</span>}
                <button type="button" onClick={() => removeImage(idx)}>
                  X
                </button>
              </div>
            ))}
          </div>

          {status && <p className="admin-status">{status}</p>}
        </section>
      </main>
    </div>
  );
}
