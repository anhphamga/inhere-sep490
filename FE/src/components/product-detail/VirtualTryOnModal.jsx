import { useState, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";

/**
 * Virtual Try-On Modal Component
 * 
 * Integrates with API4.ai Virtual Try-On API
 * Docs: https://api4.ai/docs/virtual-try-on
 * Demo: https://virtual-try-on.api4.ai/
 * 
 * Setup:
 * 1. Get API key from https://api4.ai/
 * 2. Add VITE_API4AI_KEY to .env file
 * 
 * Usage:
 * - User uploads person image (full/half body photo)
 * - Outfit image is pre-filled from product
 * - Click "Generate Try-On" to see result
 */

export default function VirtualTryOnModal({ isOpen, onClose, outfitImageUrl }) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:9000/api";
    const [personImage, setPersonImage] = useState(null);
    const [outfitImage, setOutfitImage] = useState(null);
    const [personPreview, setPersonPreview] = useState("");
    const [outfitPreview, setOutfitPreview] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Auto-set outfit from product image
    const effectiveOutfitPreview = outfitPreview || outfitImageUrl;

    // Hide header and body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll
            document.body.style.overflow = "hidden";

            // Hide main header
            const header = document.querySelector("header");
            if (header) {
                header.style.display = "none";
            }
        } else {
            // Restore body scroll
            document.body.style.overflow = "";

            // Show main header
            const header = document.querySelector("header");
            if (header) {
                header.style.display = "";
            }
        }

        return () => {
            document.body.style.overflow = "";
            const header = document.querySelector("header");
            if (header) {
                header.style.display = "";
            }
        };
    }, [isOpen]);

    const handleFileSelect = (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Vui lòng chọn file ảnh");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = event.target.result;
            if (type === "person") {
                setPersonImage(file);
                setPersonPreview(preview);
            } else {
                setOutfitImage(file);
                setOutfitPreview(preview);
            }
            setError("");
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!personImage) {
            setError("Vui lòng tải lên ảnh của bạn");
            return;
        }

        // Use uploaded outfit image or product image
        const outfitToUse = outfitImage || (outfitPreview || outfitImageUrl);

        if (!outfitToUse) {
            setError("Vui lòng tải lên ảnh trang phục");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("image", personImage);

            if (outfitImage instanceof File) {
                formData.append("image-apparel", outfitImage);
            } else if (typeof outfitToUse === "string") {
                const outfitUrl = toProxyImageUrl(outfitToUse);
                const fetchedOutfitFile = await urlToFile(outfitUrl, "apparel-from-product");
                if (!fetchedOutfitFile) {
                    throw new Error("Không thể tải ảnh sản phẩm để thử đồ. Hãy upload ảnh trang phục thủ công.");
                }
                formData.append("image-apparel", fetchedOutfitFile);
            }

            // Call backend proxy to API4.ai demo endpoint
            // Demo endpoint is free, no API key required
            const response = await fetch(
                `${apiBaseUrl}/virtual-try-on/generate`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "API request failed");
            }

            const data = await response.json();

            const apiPayload = data?.data || data;
            const firstResult = apiPayload?.results?.[0];
            const firstEntity = firstResult?.entities?.[0];
            const statusCode = firstResult?.status?.code;
            const statusMessage = firstResult?.status?.message;

            if (statusCode === "failure") {
                throw new Error(statusMessage || "API không xử lý được ảnh được cung cấp");
            }

            if (firstEntity?.image) {
                const format = (firstEntity.format || "png").toLowerCase();
                setResult(`data:image/${format};base64,${firstEntity.image}`);
            } else {
                throw new Error(statusMessage || "API không trả về ảnh kết quả");
            }
        } catch (err) {
            console.error("Virtual try-on error:", err);
            setError(err.message || "Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const urlToFile = async (url, filename) => {
        const response = await fetch(url);

        if (!response.ok) {
            return null;
        }

        const blob = await response.blob();
        const extension = blob.type === "image/png" ? "png" : "jpg";
        return new File([blob], `${filename}.${extension}`, { type: blob.type || "image/jpeg" });
    };

    const toProxyImageUrl = (url) => {
        const sourceUrl = String(url || "").trim();
        if (!sourceUrl) return "";
        if (sourceUrl.startsWith("data:") || sourceUrl.startsWith("blob:")) {
            return sourceUrl;
        }
        return `${apiBaseUrl}/proxy-image?url=${encodeURIComponent(sourceUrl)}`;
    };

    const handleReset = () => {
        setPersonImage(null);
        setOutfitImage(null);
        setPersonPreview("");
        setOutfitPreview("");
        setResult(null);
        setError("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative h-auto w-full max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <h2 className="text-xl font-bold text-slate-900">Thử đồ ảo</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:gap-6">
                    {/* Upload Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                                1
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Upload Images</h3>
                        </div>

                        {/* Person Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Person</label>
                            <div className="relative h-48 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-slate-400">
                                {personPreview ? (
                                    <div className="relative h-full w-full">
                                        <img src={personPreview} alt="Person" className="h-full w-full object-contain" />
                                        <button
                                            onClick={() => {
                                                setPersonImage(null);
                                                setPersonPreview("");
                                            }}
                                            className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white transition hover:bg-black/70"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2">
                                        <Upload className="text-slate-400" size={32} />
                                        <span className="text-sm font-medium text-blue-600">Click to upload</span>
                                        <span className="text-xs text-slate-400">Full body or half body photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileSelect(e, "person")}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Outfit Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Outfit</label>
                            <div className="relative h-48 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-slate-400">
                                {effectiveOutfitPreview ? (
                                    <div className="relative h-full w-full">
                                        <img src={effectiveOutfitPreview} alt="Outfit" className="h-full w-full object-contain" />
                                        {outfitPreview && (
                                            <button
                                                onClick={() => {
                                                    setOutfitImage(null);
                                                    setOutfitPreview("");
                                                }}
                                                className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white transition hover:bg-black/70"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2">
                                        <Upload className="text-slate-400" size={32} />
                                        <span className="text-sm font-medium text-blue-600">Click to upload</span>
                                        <span className="text-xs text-slate-400">Clothing item on flat lay or mannequin</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileSelect(e, "outfit")}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={!personImage || (!outfitImage && !outfitImageUrl) || loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Generate Try-On
                                </>
                            )}
                        </button>

                        {error && (
                            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
                        )}
                    </div>

                    {/* Result Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                                2
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Result</h3>
                        </div>

                        <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            {loading ? (
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <Loader2 size={48} className="animate-spin" />
                                    <p className="text-sm">Processing your try-on...</p>
                                </div>
                            ) : result ? (
                                <div className="relative h-full w-full">
                                    <img src={result} alt="Try-On Result" className="h-full w-full object-contain" />
                                    <button
                                        onClick={handleReset}
                                        className="absolute bottom-4 right-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                        <Upload size={32} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">No result yet</p>
                                    <p className="max-w-xs text-center text-xs text-slate-400">
                                        Upload images and hit the generate button to see the magic happen.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
