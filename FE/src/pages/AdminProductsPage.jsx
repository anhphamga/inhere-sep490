
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import "./AdminProductsPage.css";

const emptyForm = {
  name: "",
  category: "",
  baseRentPrice: 0,
  baseSalePrice: 0,
  description: "",
  sizes: [],
  colorVariants: [],
  variantPricingMode: "common",
  commonRentPrice: 0,
  variantRentPrices: {},
};

const SIZE_PRESET = ["XS", "S", "M", "L", "XL", "XXL", "FREE SIZE"];

const normalizeText = (value = "") => String(value || "").trim();
const normalizeSize = (value = "") => normalizeText(value).toUpperCase();

const normalizeImages = (images = []) =>
  Array.from(
    new Set(
      (Array.isArray(images) ? images : [])
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );

const parseSizes = (value = "") =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[|,;/]/)
        .map((item) => normalizeSize(item))
        .filter(Boolean)
    )
  );

const toCategoryNode = (node = {}) => ({
  displayName: normalizeText(node?.displayName),
  children: Array.isArray(node?.children)
    ? node.children.map((child) => toCategoryNode(child)).filter((child) => child.displayName)
    : [],
});

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const parseCurrencyInput = (raw = "") => {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
};

const buildColorVariantsFromProduct = (product = {}) => {
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    return product.colorVariants
      .map((variant, index) => ({
        id: `${variant?.color || "color"}-${index}-${Date.now()}`,
        color: normalizeText(variant?.color),
        images: normalizeImages(variant?.images),
      }))
      .filter((variant) => variant.color);
  }

  const fallbackImages = normalizeImages(
    Array.isArray(product.images) ? product.images : product.imageUrl ? [product.imageUrl] : []
  );
  if (fallbackImages.length === 0) return [];

  const colors = normalizeText(product.color)
    .split(/[|,;/]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  if (colors.length === 0) {
    return [{ id: `default-${Date.now()}`, color: "Default", images: fallbackImages }];
  }

  return colors.map((color, index) => ({
    id: `${color}-${index}-${Date.now()}`,
    color,
    images: [...fallbackImages],
  }));
};

const buildFormFromProduct = (product = null) => {
  if (!product) return { ...emptyForm };

  return {
    name: normalizeText(product.name),
    category: normalizeText(product.category),
    baseRentPrice: Number(product.baseRentPrice || 0),
    baseSalePrice: Number(product.baseSalePrice || 0),
    description: normalizeText(product.description),
    sizes:
      Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.map((item) => normalizeSize(item)).filter(Boolean)
        : parseSizes(product.size),
    colorVariants: buildColorVariantsFromProduct(product),
    variantPricingMode: "common",
    commonRentPrice: Number(product.baseRentPrice || 0),
    variantRentPrices: {},
  };
};

const snapshotForm = (form) =>
  JSON.stringify({
    ...form,
    name: normalizeText(form.name),
    category: normalizeText(form.category),
    description: normalizeText(form.description),
    sizes: Array.from(new Set((form.sizes || []).map(normalizeSize).filter(Boolean))).sort(),
    colorVariants: (form.colorVariants || [])
      .map((variant) => ({
        color: normalizeText(variant.color),
        images: normalizeImages(variant.images),
      }))
      .filter((variant) => variant.color)
      .sort((a, b) => a.color.localeCompare(b.color, "vi")),
  });

const validateForm = (form) => {
  const errors = [];
  if (!normalizeText(form.name)) errors.push("Chưa nhập tên sản phẩm.");
  if (!normalizeText(form.category)) errors.push("Chưa chọn danh mục.");
  if (Number(form.baseSalePrice) < 0 || Number(form.baseRentPrice) < 0 || Number(form.commonRentPrice) < 0) {
    errors.push("Giá không được âm.");
  }

  const sizes = (form.sizes || []).map(normalizeSize).filter(Boolean);
  if (sizes.length !== new Set(sizes).size) errors.push("Size bị trùng.");

  const variants = (form.colorVariants || [])
    .map((variant) => ({
      color: normalizeText(variant.color),
      images: normalizeImages(variant.images),
    }))
    .filter((variant) => variant.color);

  if (variants.length === 0) errors.push("Cần ít nhất 1 màu.");
  const colorKeys = variants.map((variant) => variant.color.toLowerCase());
  if (colorKeys.length !== new Set(colorKeys).size) errors.push("Màu bị trùng.");
  const missingImage = variants.find((variant) => variant.images.length === 0);
  if (missingImage) errors.push(`Màu "${missingImage.color}" phải có ít nhất 1 ảnh.`);
  if (!(variants[0]?.images?.[0])) errors.push("Cần ít nhất 1 ảnh chính.");

  return errors;
};
const buildPayload = (form) => {
  const sizes = Array.from(new Set((form.sizes || []).map(normalizeSize).filter(Boolean)));
  const colorVariants = (form.colorVariants || [])
    .map((variant) => ({
      color: normalizeText(variant.color),
      images: normalizeImages(variant.images),
    }))
    .filter((variant) => variant.color);
  const images = normalizeImages(colorVariants.flatMap((variant) => variant.images));

  return {
    name: normalizeText(form.name),
    category: normalizeText(form.category),
    size: sizes.join(", "),
    sizes,
    color: colorVariants.map((variant) => variant.color).join(", "),
    colorVariants,
    images,
    baseRentPrice:
      form.variantPricingMode === "common"
        ? Number(form.commonRentPrice || 0)
        : Number(form.baseRentPrice || 0),
    baseSalePrice: Number(form.baseSalePrice || 0),
    description: normalizeText(form.description),
    variantPricingMode: form.variantPricingMode,
    variantRentPrices: form.variantPricingMode === "custom" ? form.variantRentPrices : {},
  };
};

export default function AdminProductsPage() {
  const [lang, setLang] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("lang") || "vi" : "vi"
  );
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(snapshotForm(emptyForm));
  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");
  const [newColorInput, setNewColorInput] = useState("");
  const [activeVariantId, setActiveVariantId] = useState("");
  const [activeVariantUrl, setActiveVariantUrl] = useState("");
  const [dragOverVariantId, setDragOverVariantId] = useState("");
  const fileInputRef = useRef({});

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
      if (!mounted || list.length === 0) return;
      const first = list[0];
      const nextForm = buildFormFromProduct(first);
      setSelectedId(first._id);
      setForm(nextForm);
      setInitialSnapshot(snapshotForm(nextForm));
      setActiveVariantId(nextForm.colorVariants[0]?.id || "");
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

  const categoryMeta = useMemo(() => {
    const childToParent = new Map();
    const parentToChildren = new Map();
    const parentOptions = [];

    categoryTree.forEach((parent) => {
      const parentName = parent.displayName;
      if (!parentName) return;
      parentOptions.push(parentName);
      const children = (parent.children || []).map((child) => child.displayName).filter(Boolean);
      parentToChildren.set(parentName, children);
      children.forEach((childName) => childToParent.set(childName, parentName));
    });

    return {
      parentOptions: Array.from(new Set(parentOptions)).sort((a, b) => a.localeCompare(b, "vi")),
      parentToChildren,
      childToParent,
    };
  }, [categoryTree]);

  const childCategoryOptions = useMemo(() => {
    const children = categoryMeta.parentToChildren.get(selectedParentCategory) || [];
    return [...children].sort((a, b) => a.localeCompare(b, "vi"));
  }, [categoryMeta.parentToChildren, selectedParentCategory]);

  useEffect(() => {
    const current = normalizeText(form.category);
    if (!current) {
      return;
    }

    const inferredParent = categoryMeta.childToParent.get(current) || current;
    const inferredChild = categoryMeta.childToParent.get(current) ? current : "";
    if (selectedParentCategory !== inferredParent) setSelectedParentCategory(inferredParent);
    if (selectedChildCategory !== inferredChild) setSelectedChildCategory(inferredChild);
  }, [form.category, categoryMeta.childToParent, selectedParentCategory, selectedChildCategory]);

  useEffect(() => {
    const variants = form.colorVariants || [];
    if (variants.length === 0) {
      if (activeVariantId !== "") setActiveVariantId("");
      return;
    }
    const exists = variants.some((variant) => variant.id === activeVariantId);
    if (!exists) setActiveVariantId(variants[0].id);
  }, [form.colorVariants, activeVariantId]);
  const hasUnsavedChanges = useMemo(
    () => snapshotForm(form) !== initialSnapshot,
    [form, initialSnapshot]
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === selectedId) || null,
    [products, selectedId]
  );

  const sizeOptions = useMemo(() => {
    const fromProducts = products.flatMap((item) =>
      Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : parseSizes(item.size || "")
    );
    return Array.from(
      new Set([...SIZE_PRESET, ...fromProducts.map((item) => normalizeSize(item)), ...(form.sizes || [])])
    ).filter(Boolean);
  }, [products, form.sizes]);

  const activeVariant = useMemo(
    () => (form.colorVariants || []).find((variant) => variant.id === activeVariantId) || null,
    [form.colorVariants, activeVariantId]
  );

  const previewImage = activeVariant?.images?.[0] || form.colorVariants?.[0]?.images?.[0] || "";

  const matrix = useMemo(
    () => ({
      sizes: form.sizes || [],
      colors: (form.colorVariants || []).map((variant) => variant.color).filter(Boolean),
    }),
    [form.sizes, form.colorVariants]
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const startCreate = () => {
    setSelectedId("");
    setForm({ ...emptyForm });
    setInitialSnapshot(snapshotForm(emptyForm));
    setSelectedParentCategory("");
    setSelectedChildCategory("");
    setNewSizeInput("");
    setNewColorInput("");
    setActiveVariantId("");
    setActiveVariantUrl("");
    setStatus("");
  };

  const startEdit = async (id) => {
    const res = await fetch(`/api/products/${id}`);
    const data = res.ok ? await res.json() : { data: null };
    const product = data?.data;
    if (!product) return;
    const nextForm = buildFormFromProduct(product);
    setSelectedId(id);
    setForm(nextForm);
    setInitialSnapshot(snapshotForm(nextForm));
    setActiveVariantId(nextForm.colorVariants[0]?.id || "");
    setActiveVariantUrl("");
    setStatus("");
  };

  const toggleSize = (size) => {
    const normalized = normalizeSize(size);
    if (!normalized) return;
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(normalized)
        ? prev.sizes.filter((item) => item !== normalized)
        : [...prev.sizes, normalized],
    }));
  };

  const addNewSize = () => {
    const next = normalizeSize(newSizeInput);
    if (!next) return;
    setForm((prev) => {
      if ((prev.sizes || []).includes(next)) {
        setStatus(`Size ${next} da ton tai.`);
        return prev;
      }
      return { ...prev, sizes: [...(prev.sizes || []), next] };
    });
    setNewSizeInput("");
  };

  const addColorVariant = () => {
    const nextColor = normalizeText(newColorInput);
    if (!nextColor) return;
    setForm((prev) => {
      const exists = (prev.colorVariants || []).some(
        (variant) => normalizeText(variant.color).toLowerCase() === nextColor.toLowerCase()
      );
      if (exists) {
        setStatus(`Mau ${nextColor} da ton tai.`);
        return prev;
      }
      const id = `${nextColor}-${Date.now()}`;
      const next = [...(prev.colorVariants || []), { id, color: nextColor, images: [] }];
      setActiveVariantId(id);
      return { ...prev, colorVariants: next };
    });
    setNewColorInput("");
  };

  const updateVariant = (variantId, patch) => {
    setForm((prev) => {
      if (Object.prototype.hasOwnProperty.call(patch, "color")) {
        const nextColor = normalizeText(patch.color);
        const hasDuplicate = (prev.colorVariants || []).some(
          (variant) =>
            variant.id !== variantId
            && normalizeText(variant.color).toLowerCase() === nextColor.toLowerCase()
        );
        if (nextColor && hasDuplicate) {
          setStatus(`Mau ${nextColor} da ton tai.`);
          return prev;
        }
      }

      return {
        ...prev,
        colorVariants: (prev.colorVariants || []).map((variant) =>
          variant.id === variantId ? { ...variant, ...patch } : variant
        ),
      };
    });
  };

  const removeColorVariant = (variantId) => {
    setForm((prev) => ({
      ...prev,
      colorVariants: (prev.colorVariants || []).filter((variant) => variant.id !== variantId),
    }));
  };

  const addVariantImages = (variantId, urls) => {
    const clean = normalizeImages(urls);
    if (clean.length === 0) return;
    const current = (form.colorVariants || []).find((variant) => variant.id === variantId);
    updateVariant(variantId, { images: normalizeImages([...(current?.images || []), ...clean]) });
  };
  const handleVariantFiles = async (variantId, files) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const urls = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
    addVariantImages(variantId, urls);
  };

  const handleVariantDragOver = (variantId, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragOverVariantId !== variantId) setDragOverVariantId(variantId);
  };

  const handleVariantDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverVariantId("");
  };

  const handleVariantDrop = async (variantId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverVariantId("");
    await handleVariantFiles(variantId, event.dataTransfer?.files || []);
  };

  const removeVariantImage = (variantId, index) => {
    const current = (form.colorVariants || []).find((variant) => variant.id === variantId);
    updateVariant(variantId, { images: (current?.images || []).filter((_, idx) => idx !== index) });
  };

  const moveVariantImage = (variantId, fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    const current = ((form.colorVariants || []).find((variant) => variant.id === variantId)?.images || []).slice();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    updateVariant(variantId, { images: current });
  };

  const setVariantRentPrice = (size, color, value) => {
    const key = `${size}__${color}`;
    setForm((prev) => ({
      ...prev,
      variantRentPrices: {
        ...(prev.variantRentPrices || {}),
        [key]: Number(value || 0),
      },
    }));
  };

  const saveDraft = () => {
    try {
      localStorage.setItem("admin-product-draft", JSON.stringify(form));
      setStatus("Đã lưu nháp.");
    } catch {
      setStatus("Không thể lưu nháp.");
    }
  };

  const saveProduct = async () => {
    try {
      setSaving(true);
      setStatus("");
      if (selectedParentCategory && childCategoryOptions.length > 0 && !selectedChildCategory) {
        throw new Error("Vui long chon danh muc con.");
      }
      const errors = validateForm(form);
      if (errors.length > 0) throw new Error(errors.join(" "));

      const payload = buildPayload(form);
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
        const exists = list.find((product) => product._id === id);
        if (exists) {
          const nextForm = buildFormFromProduct(data?.data || exists);
          setSelectedId(id);
          setForm(nextForm);
          setInitialSnapshot(snapshotForm(nextForm));
          setActiveVariantId(nextForm.colorVariants[0]?.id || "");
        }
      }
      setStatus(isEditing ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm mới.");
    } catch (error) {
      setStatus(`Lỗi: ${error.message}`);
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
      const list = await loadProducts();
      if (list.length > 0) {
        await startEdit(list[0]._id);
      } else {
        startCreate();
      }
      setStatus("Đã xóa sản phẩm.");
    } catch (error) {
      setStatus(`Lỗi: ${error.message}`);
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
            <button type="button" onClick={startCreate}>+ Tạo mới</button>
          </div>
          <div className="admin-product-list">
            {products.map((product) => (
              <button
                key={product._id}
                className={`admin-product-item ${selectedId === product._id ? "active" : ""}`}
                onClick={() => startEdit(product._id)}
                type="button"
              >
                <strong>{product.name}</strong>
                <span>{product.category}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-editor">
          <div className="admin-sticky-bar">
            <div>
              <h1>{isEditing ? `Chỉnh sửa: ${selectedProduct?.name || ""}` : "Tạo sản phẩm mới"}</h1>
              {hasUnsavedChanges ? <p className="unsaved-flag">Bạn chưa lưu thay đổi</p> : <p>Đã đồng bộ</p>}
            </div>
            <div className="admin-actions">
              <button type="button" className="ghost" onClick={startCreate}>Quay lại</button>
              <button type="button" className="ghost" onClick={saveDraft} disabled={saving}>Lưu nháp</button>
              <button type="button" onClick={saveProduct} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
              {isEditing && <button className="danger" type="button" onClick={deleteProduct} disabled={saving}>Xóa</button>}
            </div>
          </div>
          <div className="editor-two-columns">
            <div className="column-left">
              <section className="admin-card">
                <h3>Phần 1: Thông tin cơ bản</h3>
                <div className="admin-form-grid one-col">
                  <label>Tên sản phẩm<input value={form.name} onChange={(e) => setField("name", e.target.value)} /></label>
                  <div className="admin-form-grid two-col">
                    <label>
                      Danh mục cha
                      <select
                        value={selectedParentCategory}
                        onChange={(e) => {
                          const parent = e.target.value;
                          const nextChildren = categoryMeta.parentToChildren.get(parent) || [];
                          setSelectedParentCategory(parent);
                          setSelectedChildCategory("");
                          setField("category", nextChildren.length > 0 ? "" : parent);
                        }}
                      >
                        <option value="">-- Chọn danh mục cha --</option>
                        {categoryMeta.parentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label>
                      Danh mục con
                      <select value={selectedChildCategory} onChange={(e) => { const child = e.target.value; setSelectedChildCategory(child); setField("category", child || selectedParentCategory); }} disabled={!selectedParentCategory || childCategoryOptions.length === 0}>
                        <option value="">{selectedParentCategory && childCategoryOptions.length > 0 ? "-- Không chọn danh mục con --" : "-- Danh mục cha không có con --"}</option>
                        {childCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="admin-form-grid two-col">
                    <label>Giá bán cơ bản<input value={Number(form.baseSalePrice || 0).toLocaleString("vi-VN")} onChange={(e) => setField("baseSalePrice", parseCurrencyInput(e.target.value))} /><small>{formatCurrency(form.baseSalePrice)}</small></label>
                    <label>Giá thuê cơ bản<input value={Number(form.baseRentPrice || 0).toLocaleString("vi-VN")} onChange={(e) => setField("baseRentPrice", parseCurrencyInput(e.target.value))} /><small>{formatCurrency(form.baseRentPrice)}</small></label>
                  </div>
                  <label>Mô tả<textarea rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} /></label>
                </div>
              </section>
            </div>

            <div className="column-right">
              <section className="admin-card">
                <h3>Phần 2: Biến thể (Size - Màu)</h3>
                <div className="section-block">
                  <h4>Size</h4>
                  <label>
                    Chọn nhiều size
                    <select multiple size={Math.min(8, sizeOptions.length || 4)} value={form.sizes} onChange={(e) => setField("sizes", Array.from(new Set(Array.from(e.target.selectedOptions).map((opt) => normalizeSize(opt.value)))))}>
                      {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <div className="inline-row"><input value={newSizeInput} onChange={(e) => setNewSizeInput(e.target.value)} placeholder="Thêm size mới" /><button type="button" onClick={addNewSize}>Thêm size mới</button></div>
                  <div className="chip-wrap">{(form.sizes || []).map((size) => <button key={size} type="button" className="chip" onClick={() => toggleSize(size)}>{size} x</button>)}</div>
                </div>

                <div className="section-block">
                  <h4>Màu</h4>
                  <div className="inline-row"><input value={newColorInput} onChange={(e) => setNewColorInput(e.target.value)} placeholder="Nhập tên màu" /><button type="button" onClick={addColorVariant}>Thêm màu</button></div>

                  <div className="color-cards">
                    {(form.colorVariants || []).map((variant) => (
                      <article key={variant.id} className={`color-card ${variant.id === activeVariantId ? "active" : ""}`} onClick={() => setActiveVariantId(variant.id)}>
                        <div className="color-card-head">
                          <input value={variant.color} onChange={(e) => updateVariant(variant.id, { color: normalizeText(e.target.value) })} placeholder="Ten mau" onClick={(e) => e.stopPropagation()} />
                          <span>{(variant.images || []).length} ảnh</span>
                        </div>
                        <div className="image-preview-grid compact">{(variant.images || []).slice(0, 6).map((img, idx) => <div key={`${variant.id}-${idx}`} className="image-preview-item"><img src={img} alt={`${variant.color}-${idx}`} /></div>)}</div>
                        <div
                          className={`variant-dropzone ${dragOverVariantId === variant.id ? "active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current[variant.id]?.click(); }}
                          onDragOver={(e) => handleVariantDragOver(variant.id, e)}
                          onDragLeave={handleVariantDragLeave}
                          onDrop={(e) => handleVariantDrop(variant.id, e)}
                        >
                          Kéo thả ảnh vào đây hoặc bấm để chọn ảnh
                        </div>
                        <div className="color-card-actions">
                          <input ref={(el) => { fileInputRef.current[variant.id] = el; }} type="file" accept="image/*" multiple hidden onChange={(e) => handleVariantFiles(variant.id, e.target.files)} />
                          <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current[variant.id]?.click(); }}>Thêm ảnh</button>
                          <button type="button" className="danger" onClick={(e) => { e.stopPropagation(); removeColorVariant(variant.id); }}>Xóa màu</button>
                        </div>

                        {variant.id === activeVariantId && (
                          <div className="variant-editor">
                            <div className="inline-row"><input value={activeVariantUrl} onChange={(e) => setActiveVariantUrl(e.target.value)} placeholder="Dán link ảnh cho màu này" /><button type="button" onClick={() => { addVariantImages(variant.id, [activeVariantUrl]); setActiveVariantUrl(""); }}>Thêm link</button></div>
                            <div className="image-preview-grid">
                              {(variant.images || []).map((img, idx) => (
                                <div key={`${variant.id}-full-${idx}`} className="image-preview-item draggable">
                                  <img src={img} alt={`${variant.color}-preview-${idx}`} />
                                  {idx === 0 && <span className="cover-badge">Ảnh chính</span>}
                                  <div className="row-mini-actions">
                                    {idx > 0 && <button type="button" onClick={() => moveVariantImage(variant.id, idx, idx - 1)}>↑</button>}
                                    {idx < (variant.images || []).length - 1 && <button type="button" onClick={() => moveVariantImage(variant.id, idx, idx + 1)}>↓</button>}
                                    <button type="button" onClick={() => removeVariantImage(variant.id, idx)}>X</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
              <section className="admin-card">
                <h3>Phần 3: Bảng biến thể</h3>
                <div className="pricing-toggle">
                  <label><input type="radio" checked={form.variantPricingMode === "common"} onChange={() => setField("variantPricingMode", "common")} />Giá thuê chung</label>
                  <label><input type="radio" checked={form.variantPricingMode === "custom"} onChange={() => setField("variantPricingMode", "custom")} />Giá riêng cho từng biến thể</label>
                </div>

                {form.variantPricingMode === "common" ? (
                  <label>Giá thuê chung<input value={Number(form.commonRentPrice || 0).toLocaleString("vi-VN")} onChange={(e) => setField("commonRentPrice", parseCurrencyInput(e.target.value))} /><small>{formatCurrency(form.commonRentPrice)}</small></label>
                ) : (
                  <div className="variant-table-wrap">
                    <table className="variant-table">
                      <thead><tr><th>Size</th>{matrix.colors.map((color) => <th key={color}>{color}</th>)}</tr></thead>
                      <tbody>
                        {matrix.sizes.map((size) => (
                          <tr key={size}>
                            <td>{size}</td>
                            {matrix.colors.map((color) => {
                              const key = `${size}__${color}`;
                              return (
                                <td key={key}>
                                  <input value={Number(form.variantRentPrices?.[key] || 0).toLocaleString("vi-VN")} onChange={(e) => setVariantRentPrice(size, color, parseCurrencyInput(e.target.value))} />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="admin-card preview-card">
                <h3>Preview sản phẩm</h3>
                <div className="preview-body">
                  {previewImage ? <img src={previewImage} alt={form.name || "preview"} /> : <div className="preview-empty">Chưa có ảnh</div>}
                  <div>
                    <p className="preview-name">{form.name || "Tên sản phẩm"}</p>
                    <p>Danh mục: {form.category || "-"}</p>
                    <p>Giá bán: {formatCurrency(form.baseSalePrice)}</p>
                    <p>Màu đang xem: {activeVariant?.color || "-"} ({activeVariant?.images?.length || 0} ảnh)</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {status && <p className="admin-status">{status}</p>}
        </section>
      </main>
    </div>
  );
}
