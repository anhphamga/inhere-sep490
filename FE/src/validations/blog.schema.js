import { z } from 'zod'
import { toTrimmedText } from '../utils/validation/validation.rules'

export const BLOG_CATEGORY_VALUES = [
  'Cẩm nang Hội An',
  'Mẹo phối đồ',
  'Tin tức',
  'Khuyến mãi',
  'Sự kiện',
  'Bảo quản trang phục',
]

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isValidUrl = (value) => {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return Boolean(parsed.protocol && parsed.host)
  } catch {
    return false
  }
}

export const createBlogSchema = ({ isDraft = false } = {}) =>
  z
    .object({
      title: z.string().transform((value) => toTrimmedText(value)),
      category: z.string().transform((value) => toTrimmedText(value)),
      tags: z
        .string()
        .max(200, 'Tags tối đa 200 ký tự.')
        .transform((value) => toTrimmedText(value))
        .optional()
        .default(''),
      thumbnail: z
        .string()
        .transform((value) => toTrimmedText(value))
        .refine((value) => isValidUrl(value), { message: 'URL thumbnail không hợp lệ.' })
        .optional()
        .default(''),
      metaTitle: z
        .string()
        .max(60, 'Meta title tối đa 60 ký tự.')
        .transform((value) => toTrimmedText(value))
        .optional()
        .default(''),
      metaDescription: z
        .string()
        .max(160, 'Meta description tối đa 160 ký tự.')
        .transform((value) => toTrimmedText(value))
        .optional()
        .default(''),
      content: z.string().transform((value) => String(value || '')),
    })
    .superRefine((value, ctx) => {
      if (isDraft) return

      if (!value.title) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['title'],
          message: 'Tiêu đề bài viết là bắt buộc.',
        })
      }

      if (!value.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: 'Danh mục bài viết là bắt buộc.',
        })
      }

      if (value.category && !BLOG_CATEGORY_VALUES.includes(value.category)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: 'Danh mục không hợp lệ.',
        })
      }

      if (value.title && value.title.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['title'],
          message: 'Tiêu đề tối thiểu 8 ký tự.',
        })
      }

      const plainContent = stripHtml(value.content)
      if (!plainContent || plainContent.length < 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['content'],
          message: 'Nội dung bài viết tối thiểu 30 ký tự.',
        })
      }
    })
