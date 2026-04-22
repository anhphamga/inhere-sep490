import { z } from "zod";

export const PRODUCT_CATEGORY_VALUES = [
  "Áo dài truyền thống",
  "Cổ phục",
  "Phụ kiện chụp ảnh cho thuê",
  "ao-dai-cho-thue",
  "co-phuc",
  "phu-kien-chup-anh-cho-thue",
];

const normalizeNfc = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

const toNumberStrict = (value) => {
  if (typeof value === "number") return value;
  const text = normalizeNfc(value);
  if (!text) return Number.NaN;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const imageUrlSchema = z.preprocess(
  (value) => normalizeNfc(value),
  z.string().url("URL ảnh không hợp lệ.")
);

const colorVariantSchema = z.object({
  name: z.preprocess((value) => normalizeNfc(value), z.string()),
  images: z.array(imageUrlSchema).default([]),
});

export const createProductSchema = ({ isDraft = false } = {}) =>
  z
    .object({
      name: z.preprocess((value) => normalizeNfc(value), z.string()),
      selectedCategory: z.preprocess((value) => normalizeNfc(value), z.string()),
      quantity: z
        .preprocess((value) => toNumberStrict(value), z.number({ invalid_type_error: "Số lượng không hợp lệ." }))
        .int("Số lượng phải là số nguyên.")
        .min(0, "Số lượng không được âm."),
      baseSalePrice: z
        .preprocess((value) => toNumberStrict(value), z.number({ invalid_type_error: "Giá bán không hợp lệ." }))
        .min(0, "Giá bán không được âm."),
      baseRentPrice: z
        .preprocess((value) => toNumberStrict(value), z.number({ invalid_type_error: "Giá thuê không hợp lệ." }))
        .min(0, "Giá thuê không được âm."),
      description: z
        .preprocess((value) => normalizeNfc(value), z.string().max(2000, "Mô tả tối đa 2000 ký tự."))
        .optional()
        .default(""),
      sizes: z
        .array(z.preprocess((value) => normalizeNfc(value), z.string()))
        .default([])
        .transform((values) => values.map((item) => item.toUpperCase()).filter(Boolean)),
      colors: z.array(colorVariantSchema).default([]),
    })
    .superRefine((value, ctx) => {
      if (isDraft) return;

      if (!value.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: "Tên sản phẩm là bắt buộc.",
        });
      }

      if (value.name && (value.name.length < 3 || value.name.length > 120)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: "Tên sản phẩm phải từ 3 đến 120 ký tự.",
        });
      }

      if (!value.selectedCategory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedCategory"],
          message: "Danh mục là bắt buộc.",
        });
      }

      if (value.selectedCategory && !PRODUCT_CATEGORY_VALUES.includes(value.selectedCategory)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedCategory"],
          message: "Danh mục không hợp lệ.",
        });
      }

      if (!Array.isArray(value.sizes) || value.sizes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sizes"],
          message: "Phải có ít nhất 1 size.",
        });
      }

      if (!Array.isArray(value.colors) || value.colors.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["colors"],
          message: "Phải có ít nhất 1 màu.",
        });
      }

      if (Array.isArray(value.colors)) {
        const seen = new Set();
        value.colors.forEach((item, index) => {
          const colorName = normalizeNfc(item?.name);
          if (!colorName) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["colors", index, "name"],
              message: "Tên màu không được để trống.",
            });
          } else {
            const key = colorName.toLowerCase();
            if (seen.has(key)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["colors", index, "name"],
                message: "Tên màu bị trùng.",
              });
            }
            seen.add(key);
          }

          if (!Array.isArray(item?.images) || item.images.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["colors", index, "images"],
              message: "Mỗi màu cần ít nhất 1 ảnh.",
            });
          }
        });
      }

      if (value.baseRentPrice > value.baseSalePrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseRentPrice"],
          message: "Giá thuê không được lớn hơn giá bán.",
        });
      }
    });
