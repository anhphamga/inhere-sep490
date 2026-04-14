export const formatConditionLabel = (percent) => {
  const normalized = Number(percent);

  if (normalized === 100) return 'Mới – 100%';
  if ([75, 50, 25].includes(normalized)) return `Tình trạng tốt – ${normalized}%`;
  return 'Tình trạng tốt';
};

export const getConditionBadgeClass = (percent) => (
  Number(percent) === 100
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-sky-100 text-sky-700'
);

