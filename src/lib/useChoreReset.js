import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isToday } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Resets any chore completed on a previous day back to undone.
 * Call this hook in any page that displays chore data.
 */
export function useChoreReset(chores = [], familyId = null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!familyId || !chores.length) return;

    const stale = chores.filter(
      (c) => c.completed && c.completed_at && !isToday(new Date(c.completed_at))
    );
    if (!stale.length) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        stale.map((chore) =>
          supabase
            .from('chores')
            .update({
              completed: false,
              completed_by: null,
              completed_at: null,
              last_reset_at: new Date().toISOString(),
            })
            .eq('id', chore.id)
        )
      );
      results.forEach((res, i) => {
        if (res.error) {
          console.error(`Failed to reset chore ${stale[i]?.id}:`, res.error.message);
        }
      });
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['chores', familyId] });
        queryClient.invalidateQueries({ queryKey: ['chores-home'] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chores, familyId, queryClient]);
}
