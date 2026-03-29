import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LAST_COLLECTION_SLUG_KEY = 'last_collection_slug';

export default function CollectionEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const querySlug = String(searchParams.get('slug') || '').trim();
    if (querySlug) {
      navigate(`/collections/${querySlug}`, { replace: true });
      return;
    }

    const savedSlug = String(localStorage.getItem(LAST_COLLECTION_SLUG_KEY) || '').trim();
    if (savedSlug) {
      navigate(`/collections/${savedSlug}`, { replace: true });
      return;
    }

    navigate('/buy?purpose=rent', { replace: true });
  }, [navigate, searchParams]);

  return null;
}
