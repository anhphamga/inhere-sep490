import ColorSelector from "./ColorSelector";
import SizeSelector from "./SizeSelector";

export default function VariantSelector({
  colors,
  sizes,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
  getSwatchClass,
  isColorDisabled,
  isSizeDisabled,
  isFreeSize,
}) {
  return (
    <div className="space-y-5 rounded-3xl border border-neutral-200 bg-neutral-50/50 p-4 lg:p-5">
      <ColorSelector
        colors={colors}
        selectedColor={selectedColor}
        onSelect={onColorChange}
        getSwatchClass={getSwatchClass}
        isDisabled={isColorDisabled}
      />
      <SizeSelector
        sizes={sizes}
        selectedSize={selectedSize}
        onSelect={onSizeChange}
        isDisabled={isSizeDisabled}
        isFreeSize={isFreeSize}
      />
    </div>
  );
}
