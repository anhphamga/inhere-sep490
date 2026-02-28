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

const SIZE_PRESET = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

const parseSizeValue = (value = "") =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[,\|;/]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

const formatSizeValue = (sizes = []) => sizes.join(", ");

const parseColorValue = (value = "") =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[,\|;/]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

const formatColorValue = (colors = []) => colors.join(", ");

const toCategoryNode = (node = {}) => ({
  displayName: String(node?.displayName || "").trim(),
  children: Array.isArray(node?.children)
    ? node.children.map((child) => toCategoryNode(child)).filter((child) => child.displayName)
    : [],
});

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
  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);
  const [customColorInput, setCustomColorInput] = useState("");
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
          images: Array.isArray(first.images) ? first.images : first.imageUrl ? [first.imageUrl] : [],
        });
        setSelectedSizes(parseSizeValue(first.size || ""));
        setSelectedColors(parseColorValue(first.color || ""));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const data = res.ok ? await res.json() : { categories: [] };
        const tree = Array.isArray(data?.categories)
          ? data.categories.map((item) => toCategoryNode(item)).filter((item) => item.displayName)
          : [];
        if (mounted) setCategoryTree(tree);
      } catch {
        if (mounted) setCategoryTree([]);
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

  const categoryMeta = useMemo(() => {
    const childToParent = new Map();
    const parentToChildren = new Map();
    const parentOptions = [];

    categoryTree.forEach((parent) => {
      const parentName = parent.displayName;
      if (!parentName) return;

      parentOptions.push(parentName);
      const children = (parent.children || []).map((item) => item.displayName).filter(Boolean);
      parentToChildren.set(parentName, children);
      children.forEach((childName) => childToParent.set(childName, parentName));
    });

    const fromProducts = products.map((item) => String(item.category || "").trim()).filter(Boolean);
    fromProducts.forEach((name) => {
      if (!parentOptions.includes(name) && !childToParent.has(name)) {
        parentOptions.push(name);
        parentToChildren.set(name, []);
      }
    });

    return {
      parentOptions: Array.from(new Set(parentOptions)).sort((a, b) => a.localeCompare(b, "vi")),
      parentToChildren,
      childToParent,
    };
  }, [categoryTree, products]);

  const childCategoryOptions = useMemo(() => {
    const children = categoryMeta.parentToChildren.get(selectedParentCategory) || [];
    return [...children].sort((a, b) => a.localeCompare(b, "vi"));
  }, [categoryMeta.parentToChildren, selectedParentCategory]);

  useEffect(() => {
    const current = String(form.category || "").trim();
    if (!current) {
      if (selectedParentCategory !== "") setSelectedParentCategory("");
      if (selectedChildCategory !== "") setSelectedChildCategory("");
      return;
    }

    const inferredParent = categoryMeta.childToParent.get(current) || current;
    const inferredChild = categoryMeta.childToParent.get(current) ? current : "";

    if (selectedParentCategory !== inferredParent) setSelectedParentCategory(inferredParent);
    if (selectedChildCategory !== inferredChild) setSelectedChildCategory(inferredChild);
  }, [form.category, categoryMeta.childToParent, selectedParentCategory, selectedChildCategory]);

  const colorOptions = useMemo(() => {
    const presetColors = [
      "Đỏ",
      "Đỏ đô",
      "Hồng",
      "Hồng pastel",
      "Xanh dương",
      "Xanh đậm",
      "Xanh navy",
      "Xanh lá",
      "Vàng",
      "Trắng",
      "Đen",
      "Tím",
      "Nâu",
      "Kem",
      "Be",
      "Ghi",
    ];
    const fromProducts = products.map((item) => String(item.color || "").trim()).filter(Boolean);
    const fromCurrent = parseColorValue(form.color || "");
    return Array.from(new Set([...presetColors, ...fromProducts, ...selectedColors, ...fromCurrent])).sort(
      (a, b) => a.localeCompare(b, "vi")
    );
  }, [products, form.color, selectedColors]);

  const sizeOptions = useMemo(() => {
    const fromProducts = products.flatMap((item) => parseSizeValue(item.size || ""));
    const fromCurrent = parseSizeValue(form.size || "");
    return Array.from(new Set([...SIZE_PRESET, ...fromProducts, ...selectedSizes, ...fromCurrent])).sort((a, b) =>
      a.localeCompare(b, "vi")
    );
  }, [products, form.size, selectedSizes]);

  useEffect(() => {
    const normalized = formatSizeValue(selectedSizes);
    if (normalized !== form.size) {
      setField("size", normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSizes]);

  useEffect(() => {
    const normalized = formatColorValue(selectedColors);
    if (normalized !== form.color) {
      setField("color", normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColors]);

  const startCreate = () => {
    setSelectedId("");
    setForm(emptyForm);
    setSelectedParentCategory("");
    setSelectedChildCategory("");
    setSelectedSizes([]);
    setCustomSizeInput("");
    setSelectedColors([]);
    setCustomColorInput("");
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
    setSelectedSizes(parseSizeValue(p.size || ""));
    setCustomSizeInput("");
    setSelectedColors(parseColorValue(p.color || ""));
    setCustomColorInput("");
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSize = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((item) => item !== size) : [...prev, size]
    );
  };

  const addCustomSize = () => {
    const next = customSizeInput.trim();
    if (!next) return;
    setSelectedSizes((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setCustomSizeInput("");
  };

  const toggleColor = (color) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((item) => item !== color) : [...prev, color]
    );
  };

  const addCustomColor = () => {
    const next = customColorInput.trim();
    if (!next) return;
    setSelectedColors((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setCustomColorInput("");
  };

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
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= next.length || toIndex >= next.length) {
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
              Danh mục cha
              <select
                value={selectedParentCategory}
                onChange={(e) => {
                  const parent = e.target.value;
                  setSelectedParentCategory(parent);
                  setSelectedChildCategory("");
                  setField("category", parent);
                }}
              >
                <option value="">-- Chọn danh mục cha --</option>
                {categoryMeta.parentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Danh mục con
              <select
                value={selectedChildCategory}
                onChange={(e) => {
                  const child = e.target.value;
                  setSelectedChildCategory(child);
                  setField("category", child || selectedParentCategory);
                }}
                disabled={!selectedParentCategory || childCategoryOptions.length === 0}
              >
                <option value="">
                  {selectedParentCategory && childCategoryOptions.length > 0
                    ? "-- Không chọn danh mục con --"
                    : "-- Danh mục cha không có con --"}
                </option>
                {childCategoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Size
              <div className="size-multi-wrap">
                <div className="size-multi-grid">
                  {sizeOptions.map((size) => (
                    <label key={size} className="size-pill">
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(size)}
                        onChange={() => toggleSize(size)}
                      />
                      <span>{size}</span>
                    </label>
                  ))}
                </div>
                <div className="size-custom-row">
                  <input
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    placeholder="Thêm size tùy chỉnh (ví dụ: 3XL)"
                  />
                  <button type="button" onClick={addCustomSize}>
                    Thêm size
                  </button>
                </div>
              </div>
            </label>
            <label>
              Màu
              <div className="size-multi-wrap">
                <div className="size-multi-grid">
                  {colorOptions.map((color) => (
                    <label key={color} className="size-pill">
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color)}
                        onChange={() => toggleColor(color)}
                      />
                      <span>{color}</span>
                    </label>
                  ))}
                </div>
                <div className="size-custom-row">
                  <input
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    placeholder="Thêm màu tùy chỉnh (ví dụ: Xanh mint)"
                  />
                  <button type="button" onClick={addCustomColor}>
                    Thêm màu
                  </button>
                </div>
              </div>
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
                key={`${String(img).slice(0, 24)}-${idx}`}
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
