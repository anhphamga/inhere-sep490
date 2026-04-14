import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX_VN = /^(?:0\d{9}|84\d{9})$/;

const normalizeNfc = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

const normalizePhoneDigits = (value) => String(value ?? "").replace(/\D+/g, "");

const normalizeIdentifier = (value) => {
  const text = normalizeNfc(value);
  if (!text) return "";

  const lowered = text.toLowerCase();
  if (EMAIL_REGEX.test(lowered)) return lowered;

  const phoneDigits = normalizePhoneDigits(text);
  if (PHONE_REGEX_VN.test(phoneDigits)) return phoneDigits;

  return text;
};

const isEmailOrPhone = (value) => {
  const normalized = normalizeIdentifier(value);
  return EMAIL_REGEX.test(normalized) || PHONE_REGEX_VN.test(normalizePhoneDigits(normalized));
};

export const loginSchema = z.object({
  identifier: z
    .preprocess((value) => normalizeIdentifier(value), z.string())
    .refine((value) => value.length > 0, { message: "Vui lòng nhập email hoặc số điện thoại." })
    .refine((value) => isEmailOrPhone(value), {
      message: "Email hoặc số điện thoại không hợp lệ.",
    }),
  password: z.preprocess(
    (value) => normalizeNfc(value),
    z
      .string()
      .min(1, "Vui lòng nhập mật khẩu.")
      .min(6, "Mật khẩu tối thiểu 6 ký tự.")
  ),
  rememberMe: z.boolean().optional(),
});
