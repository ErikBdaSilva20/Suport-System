import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SetupPending {
  resend: boolean;
  general: boolean;
  sla: boolean;
  automation: boolean;
}

export interface SetupStatus {
  loading: boolean;
  isComplete: boolean;
  pending: SetupPending;
  refetch: () => Promise<void>;
}

const DEFAULT_SUPPORT_EMAIL = 'suporte@empresa.com';
const DEFAULT_COMPANY_NAME = 'Help Desk';

export function useSetupStatus(enabled: boolean): SetupStatus {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<SetupPending>({
    resend: true, general: true, sla: true, automation: true,
  });

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [settingsRes, slaRes, ruleRes] = await Promise.all([
        supabase.from('settings')
          .select('company_name, support_email, timezone, business_hours_start, business_hours_end, business_days, resend_api_key_masked, resend_webhook_secret_masked')
          .limit(1).maybeSingle(),
        supabase.from('sla_policies').select('id', { count: 'exact', head: true }),
        supabase.from('priority_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const s = settingsRes.data as any;
      const generalPending = !s
        || !s.company_name?.trim()
        || s.company_name === DEFAULT_COMPANY_NAME
        || !s.support_email?.trim()
        || s.support_email === DEFAULT_SUPPORT_EMAIL
        || !s.timezone
        || !s.business_hours_start
        || !s.business_hours_end
        || !Array.isArray(s.business_days) || s.business_days.length === 0;

      const resendPending = !s?.resend_api_key_masked || !s?.resend_webhook_secret_masked;

      setPending({
        resend: resendPending,
        general: generalPending,
        sla: (slaRes.count ?? 0) === 0,
        automation: (ruleRes.count ?? 0) === 0,
      });
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { fetch(); }, [fetch]);

  const isComplete = !pending.resend && !pending.general && !pending.sla && !pending.automation;

  return { loading, isComplete, pending, refetch: fetch };
}
