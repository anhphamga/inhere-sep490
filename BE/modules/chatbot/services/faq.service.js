const fs = require('fs');
const path = require('path');

const FAQ_FILE = path.join(__dirname, '..', 'knowledge', 'customer-faq-50-qa.md');

let cachedFaq = null;

const normalizeForMatch = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const toTokenSet = (value) => {
  return new Set(
    normalizeForMatch(value)
      .split(' ')
      .filter((token) => token.length >= 2)
  );
};

const overlapScore = (query, question) => {
  const qTokens = toTokenSet(query);
  if (!qTokens.size) {
    return 0;
  }

  const faqTokens = toTokenSet(question);
  if (!faqTokens.size) {
    return 0;
  }

  let hit = 0;
  qTokens.forEach((token) => {
    if (faqTokens.has(token)) {
      hit += 1;
    }
  });

  return hit / qTokens.size;
};

const includesAny = (value, keywords = []) => {
  return keywords.some((keyword) => value.includes(keyword));
};

const parseFaq = (raw) => {
  const blocks = String(raw || '').match(/###\s+\d+\)[\s\S]*?(?=\n###\s+\d+\)|$)/g) || [];

  return blocks
    .map((block) => {
      const qMatch = block.match(/Hỏi:\s*(.+)/i);
      const aMatch = block.match(/Đáp:\s*([\s\S]+)/i);

      return {
        question: qMatch ? qMatch[1].trim() : '',
        answer: aMatch ? aMatch[1].trim() : '',
      };
    })
    .filter((item) => item.question && item.answer);
};

const loadFaq = () => {
  if (cachedFaq) {
    return cachedFaq;
  }

  if (!fs.existsSync(FAQ_FILE)) {
    cachedFaq = [];
    return cachedFaq;
  }

  const raw = fs.readFileSync(FAQ_FILE, 'utf8');
  cachedFaq = parseFaq(raw);
  return cachedFaq;
};

const findFaqAnswer = (message) => {
  const faqItems = loadFaq();
  if (!faqItems.length) {
    return null;
  }

  const normalized = normalizeForMatch(message);

  if ((normalized.includes('size') || normalized.includes('co')) && /1m\d{2}|cao\s*\d/.test(normalized)) {
    return {
      question: 'Mình cao 1m75 thì mặc size nào hợp?',
      answer: 'Để chọn đúng size, bạn cho shop thêm cân nặng và số đo ngực-eo-hông. Nếu chưa có số đo, bạn có thể gửi chiều cao và cân nặng để shop tư vấn nhanh size phù hợp.',
      score: 0.95,
    };
  }

  if (includesAny(normalized, ['lam hong', 'rach', 'hu hong', 'hong do'])) {
    return {
      question: 'Nếu làm rách đồ thì phí bồi thường tính như thế nào?',
      answer: 'Nếu đồ bị hư hỏng trong thời gian thuê, bạn báo shop sớm để được hướng dẫn. Phí xử lý sẽ dựa trên mức độ hư hỏng và chính sách áp dụng cho đơn của bạn.',
      score: 0.95,
    };
  }

  if (includesAny(normalized, ['lam mat', 'mat do', 'mat ao', 'that lac'])) {
    return {
      question: 'Nếu làm mất đồ thuê thì xử lý thế nào?',
      answer: 'Khi làm mất đồ thuê, bạn nên báo ngay để shop hỗ trợ quy trình đối soát. Tiền cọc sẽ được bù trừ trước, phần chênh lệch sẽ xử lý theo chính sách bồi thường của đơn.',
      score: 0.95,
    };
  }

  if (includesAny(normalized, ['den lay muon', 'lay muon', 'tre gio lay'])) {
    return {
      question: 'Đến lấy đồ muộn có sao không?',
      answer: 'Bạn nên báo sớm để shop kiểm tra khả năng giữ đơn theo khung giờ mới. Nếu quá thời gian giữ chỗ của đơn, đơn có thể bị xử lý theo chính sách không đến nhận.',
      score: 0.9,
    };
  }

  if (includesAny(normalized, ['khong den nhan', 'no show', 'noshow'])) {
    return {
      question: 'Không đến nhận đồ có bị mất cọc không?',
      answer: 'Nếu không đến nhận và không thông báo trước, đơn có thể bị đóng theo diện no-show. Tiền cọc sẽ được xử lý theo quy định áp dụng cho đơn tại thời điểm đó.',
      score: 0.9,
    };
  }

  let best = null;
  faqItems.forEach((item) => {
    const score = overlapScore(message, item.question);
    if (!best || score > best.score) {
      best = {
        ...item,
        score,
      };
    }
  });

  if (!best || best.score < 0.42) {
    return null;
  }

  return {
    question: best.question,
    answer: best.answer,
    score: Number(best.score.toFixed(4)),
  };
};

module.exports = {
  findFaqAnswer,
};
