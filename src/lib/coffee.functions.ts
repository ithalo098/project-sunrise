import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getRanking = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ 
    filter: z.enum(['today', 'week', 'month', 'all']),
    limit: z.number().default(100)
  }).parse(data))
  .handler(async ({ data }) => {
    // Implementação simplificada para o ranking
    // Em produção, isso usaria uma view ou tabela agregada
    let query = supabase
      .from('profiles')
      .select('username, display_name, avatar_url, xp, level');
    
    // Aqui adicionaríamos lógica de filtro de tempo baseada em coffee_entries
    const { data: ranking, error } = await query
      .order('xp', { ascending: false })
      .limit(data.limit);
      
    if (error) throw error;
    return ranking;
  });

export const getUserStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return profile;
  });
