import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LAST_COLLECTION_SLUG_KEY = 'last_collection_slug';
const toText = (value) => String(value || '').trim();

export default function CollectionEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let mounted = true;

    const resolveCollectionEntry = async () => {
      const querySlug = toText(searchParams.get('slug'));
      if (querySlug) {
        navigate(`/collections/${querySlug}`, { replace: true });
        return;
      }

      const savedSlug = toText(localStorage.getItem(LAST_COLLECTION_SLUG_KEY));
      if (savedSlug) {
        navigate(`/collections/${savedSlug}`, { replace: true });
        return;
      }

      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const categories = Array.isArray(payload?.categories) ? payload.categories : [];

        const firstCollectionSlug = categories
          .map((category) => toText(category?.slug || category?.value))
          .find(Boolean);

        if (!mounted) return;

        if (firstCollectionSlug) {
          navigate(`/collections/${firstCollectionSlug}`, { replace: true });
          return;
        }
      } catch {
        // fallback below
      }

      if (!mounted) return;
      navigate('/buy?purpose=rent', { replace: true });
    };

    resolveCollectionEntry();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams]);

  return null;
}
