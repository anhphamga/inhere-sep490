import { useEffect, useMemo, useState } from "react";
import { useTranslationDisplay } from "../hooks/useTranslationDisplay";

export default function ProductCard({ product, lang = "vi" }) {
  const { translateFields } = useTranslationDisplay(lang);
  const [translated, setTranslated] = useState({
    name: product?.name || "",
    category: product?.category || "",
    description: product?.description || "",
  });

  const fields = useMemo(
    () => [
      { id: "name", text: product?.name || "" },
      { id: "category", text: product?.category || "" },
      { id: "description", text: product?.description || "" },
    ],
    [product?.name, product?.category, product?.description]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (lang !== "en") {
        if (mounted) {
          setTranslated({
            name: product?.name || "",
            category: product?.category || "",
            description: product?.description || "",
          });
        }
        return;
      }

      const result = await translateFields(fields, { source: "vi", target: "en" });
      if (mounted) {
        setTranslated({
          name: result.name || product?.name || "",
          category: result.category || product?.category || "",
          description: result.description || product?.description || "",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fields, lang, product?.category, product?.description, product?.name, translateFields]);

  return (
    <article className="product-card">
      <img src={product?.imageUrl || ""} alt={translated.name} />
      <h3>{translated.name}</h3>
      <p>{translated.category}</p>
      <p>{translated.description}</p>
    </article>
  );
}
