import { z } from "zod";

export const CHECKOUT_PAYMENT_METHODS = ["COD", "PayOS", "PayPal"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX_VN_STRICT = /^(?:0\d{9}|\+84\d{9})$/;

const normalizeNfc = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

const normalizeEmail = (value) => normalizeNfc(value).toLowerCase();

const normalizePhoneVN = (value) => {
  const raw = String(value ?? "").normalize("NFC").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  }
  return cleaned.replace(/\D/g, "");
};

const hasAtLeastTwoWords = (value) => normalizeNfc(value).split(" ").filter(Boolean).length >= 2;

const isValidAddressDetail = (value) => {
  const text = normalizeNfc(value);
  return text.length >= 5 && text.includes(" ");
};

export const createCheckoutSchema = (options = {}) =>
  z
    .object({
      name: z.preprocess(
        (value) => normalizeNfc(value),
        z
          .string()
          .min(1, "Vui lòng nhập họ và tên.")
          .max(80, "Họ và tên tối đa 80 ký tự.")
          .refine((value) => hasAtLeastTwoWords(value), { message: "Họ và tên cần ít nhất 2 từ." })
      ),
      phone: z
        .preprocess((value) => normalizePhoneVN(value), z.string())
        .refine((value) => PHONE_REGEX_VN_STRICT.test(value), { message: "Số điện thoại chưa hợp lệ." }),
      email: z
        .preprocess((value) => normalizeEmail(value), z.string())
        .refine((value) => EMAIL_REGEX.test(value), { message: "Email chưa hợp lệ." }),
      province: z.preprocess(
        (value) => normalizeNfc(value),
        z.string().min(1, "Chọn tỉnh/thành phố.")
      ),
      district: z.preprocess(
        (value) => normalizeNfc(value),
        z.string().min(1, "Chọn quận/huyện.")
      ),
      ward: z.preprocess(
        (value) => normalizeNfc(value),
        z.string().min(1, "Chọn phường/xã.")
      ),
      detailedAddress: z.preprocess(
        (value) => normalizeNfc(value),
        z
          .string()
          .min(1, "Nhập địa chỉ chi tiết.")
          .max(255, "Địa chỉ chi tiết tối đa 255 ký tự.")
          .refine((value) => isValidAddressDetail(value), {
            message: "Địa chỉ cần từ 5 ký tự và chứa khoảng trắng.",
          })
      ),
      paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS, {
        error: "Phương thức thanh toán không hợp lệ.",
      }),
      note: z
        .preprocess((value) => normalizeNfc(value), z.string().max(500, "Ghi chú tối đa 500 ký tự."))
        .optional(),
    })
    .superRefine((value, ctx) => {
      const requireVerifiedEmail = Boolean(options?.requireVerifiedEmail);
      const verifiedEmail = typeof options?.verifiedEmail === "string"
        ? normalizeEmail(options.verifiedEmail)
        : "";

      if (requireVerifiedEmail && verifiedEmail && value.email !== verifiedEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email thanh toán phải trùng với email đã xác minh.",
        });
      }
    });
