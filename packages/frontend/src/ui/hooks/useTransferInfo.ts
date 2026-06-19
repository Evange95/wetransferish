import { useState, useEffect } from 'react';
import type { Transfer } from '../../domain/model/Transfer.js';
import { fetchTransferInfo } from '../../config/container.js';

export function useTransferInfo(shareLink: string) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchTransferInfo.execute(shareLink)
      .then((info) => { if (!cancelled) { setTransfer(info); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [shareLink]);

  return { transfer, loading, error };
}
