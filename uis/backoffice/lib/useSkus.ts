"use client";

import { useEffect, useState } from "react";
import { toUserMessage } from "./http";
import { listSkus, type Sku } from "./inventory";

/** Loads the SKU list for the order forms' product selectors. */
export function useSkus() {
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // ?sku_id= from the stock table links; read after the first load so server and client render the same.
  const [preselectedId, setPreselectedId] = useState("");

  useEffect(() => {
    let active = true;
    listSkus()
      .then((items) => {
        if (!active) return;
        setSkus(items);
        setError("");
        const fromUrl = new URLSearchParams(window.location.search).get("sku_id") ?? "";
        if (items.some((sku) => String(sku.id) === fromUrl)) setPreselectedId(fromUrl);
      })
      .catch((reason) => { if (active) setError(toUserMessage(reason, "No se pudieron cargar los SKUs.")); });
    return () => { active = false; };
  }, [reloadKey]);

  return { skus, error, preselectedId, reload: () => { setError(""); setReloadKey((key) => key + 1); } };
}
