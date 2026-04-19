import { z } from "zod";
import { normalizePhone } from "../utils/validation/validation.rules";

const PHONE_REGEX_VN = /^(?:0\d{9}|\+84\d{9})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const normalizeNfc = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

const normalizeName = (value) => normalizeNfc(value);
const normalizeEmail = (value) => normalizeNfc(value).toLowerCase();

const hasAtLeastTwoWords = (value) =>
  normalizeName(value).split(" ").filter(Boolean).length >= 2;

const isStrongPassword = (value) => /[A-Z]/.test(value) && /\d/.test(value);

export const registerSchema = z
  .object({
    name: z
      .preprocess((value) => normalizeName(value), z.string())
      .refine((value) => value.length > 0, { message: "Vui lòng nhập họ và tên." })
      .refine((value) => value.length >= 2, { message: "Họ và tên tối thiểu 2 ký tự." })
      .refine((value) => value.length <= 80, { message: "Họ và tên tối đa 80 ký tự." })
      .refine((value) => hasAtLeastTwoWords(value), { message: "Họ và tên cần ít nhất 2 từ." }),
    phone: z
      .preprocess((value) => normalizePhone(value), z.string())
      .refine((value) => PHONE_REGEX_VN.test(value), { message: "Số điện thoại không hợp lệ." }),
    email: z.preprocess(
      (value) => normalizeEmail(value),
      z
        .string()
        .max(100, "Email tối đa 100 ký tự.")
        .refine((value) => EMAIL_REGEX.test(value), { message: "Email không hợp lệ." })
    ),
    password: z.preprocess(
      (value) => normalizeNfc(value),
      z
        .string()
        .min(1, "Vui lòng nhập mật khẩu.")
        .min(6, "Mật khẩu tối thiểu 6 ký tự.")
        .max(64, "Mật khẩu tối đa 64 ký tự.")
        .refine((value) => isStrongPassword(value), {
          message: "Mật khẩu phải có ít nhất 1 chữ hoa và 1 số.",
        })
    ),
    confirmPassword: z.preprocess(
      (value) => normalizeNfc(value),
      z
        .string()
        .min(1, "Vui lòng nhập xác nhận mật khẩu.")
        .min(6, "Mật khẩu xác nhận tối thiểu 6 ký tự.")
    ),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận không khớp.",
      });
    }
  });
