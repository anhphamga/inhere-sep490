import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import RentPage from "./RentPage";
import ShopPage from "./ShopPage";

export default function BuyPage() {
  const location = useLocation();

  const purpose = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = String(params.get("purpose") || "buy").trim().toLowerCase();
    return value === "rent" ? "rent" : "buy";
  }, [location.search]);

  return purpose === "rent" ? <RentPage /> : <ShopPage />;
}
