export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          email: string
          role: 'admin' | 'gerencia' | 'head' | 'financeiro' | 'colaborador' | 'cliente'
          avatar_url: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          role?: 'admin' | 'gerencia' | 'head' | 'financeiro' | 'colaborador' | 'cliente'
          avatar_url?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          role?: 'admin' | 'gerencia' | 'head' | 'financeiro' | 'colaborador' | 'cliente'
          avatar_url?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gravacoes: {
        Row: {
          id: string
          cliente_id: string | null
          titulo: string
          descricao: string | null
          link_gravacao: string | null
          google_event_id: string | null
          data_gravacao: string
          duracao_min: number | null
          responsavel_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          titulo: string
          descricao?: string | null
          link_gravacao?: string | null
          google_event_id?: string | null
          data_gravacao?: string
          duracao_min?: number | null
          responsavel_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string | null
          titulo?: string
          descricao?: string | null
          link_gravacao?: string | null
          google_event_id?: string | null
          data_gravacao?: string
          duracao_min?: number | null
          responsavel_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          id: string
          nome_fantasia: string
          razao_social: string | null
          cnpj: string | null
          segmento: string | null
          status: 'ativo' | 'pausado' | 'inativo' | 'inadimplente'
          mensalidade: number
          data_inicio: string
          data_renovacao: string
          health_score: number
          campanha_status: 'ativa' | 'pausada'
          whatsapp_grupo: string | null
          gestor_id: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome_fantasia: string
          razao_social?: string | null
          cnpj?: string | null
          segmento?: string | null
          status?: 'ativo' | 'pausado' | 'inativo' | 'inadimplente'
          mensalidade?: number
          data_inicio?: string
          data_renovacao?: string
          health_score?: number
          campanha_status?: 'ativa' | 'pausada'
          whatsapp_grupo?: string | null
          gestor_id?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome_fantasia?: string
          razao_social?: string | null
          cnpj?: string | null
          segmento?: string | null
          status?: 'ativo' | 'pausado' | 'inativo' | 'inadimplente'
          mensalidade?: number
          data_inicio?: string
          data_renovacao?: string
          health_score?: number
          campanha_status?: 'ativa' | 'pausada'
          whatsapp_grupo?: string | null
          gestor_id?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cliente_usuarios: {
        Row: {
          id: string
          cliente_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          profile_id?: string
          created_at?: string
        }
        Relationships: []
      }
      cliente_dna: {
        Row: {
          id: string
          cliente_id: string
          descricao: string | null
          diferencial: string | null
          persona_descricao: string | null
          persona_interesses: string[]
          tom_de_voz: string[]
          exemplo_copy: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          descricao?: string | null
          diferencial?: string | null
          persona_descricao?: string | null
          persona_interesses?: string[]
          tom_de_voz?: string[]
          exemplo_copy?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          descricao?: string | null
          diferencial?: string | null
          persona_descricao?: string | null
          persona_interesses?: string[]
          tom_de_voz?: string[]
          exemplo_copy?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cliente_ativos: {
        Row: {
          id: string
          cliente_id: string
          tipo: 'logo' | 'paleta' | 'fotos' | 'videos'
          url: string
          nome: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          tipo: 'logo' | 'paleta' | 'fotos' | 'videos'
          url: string
          nome?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          tipo?: 'logo' | 'paleta' | 'fotos' | 'videos'
          url?: string
          nome?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          id: string
          cliente_id: string
          valor: number
          status: 'pago' | 'pendente' | 'atrasado' | 'cancelado'
          tipo_status: 'normal' | 'permuta' | 'isento' | 'cortesia' | null
          data_vencimento: string
          data_pagamento: string | null
          competencia: string
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          valor: number
          status?: 'pago' | 'pendente' | 'atrasado' | 'cancelado'
          tipo_status?: 'normal' | 'permuta' | 'isento' | 'cortesia' | null
          data_vencimento: string
          data_pagamento?: string | null
          competencia: string
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          valor?: number
          status?: 'pago' | 'pendente' | 'atrasado' | 'cancelado'
          tipo_status?: 'normal' | 'permuta' | 'isento' | 'cortesia' | null
          data_vencimento?: string
          data_pagamento?: string | null
          competencia?: string
          created_at?: string
        }
        Relationships: []
      }
      verbas: {
        Row: {
          id: string
          cliente_id: string
          mes: string
          verba_total: number
          verba_meta: number | null
          verba_google: number | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          mes: string
          verba_total?: number
          verba_meta?: number | null
          verba_google?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          mes?: string
          verba_total?: number
          verba_meta?: number | null
          verba_google?: number | null
          created_at?: string
        }
        Relationships: []
      }
      producoes: {
        Row: {
          id: string
          cliente_id: string
          titulo: string
          tipo: 'video' | 'imagem' | 'copy' | 'story' | 'reels'
          status: 'rascunho' | 'editando' | 'aguardando_aprovacao' | 'aprovada' | 'reprovada' | 'agendada' | 'publicada'
          responsavel_id: string | null
          preview_url: string | null
          duracao_segundos: number | null
          aprovado_em: string | null
          aprovado_por: string | null
          reprovado_motivo: string | null
          data_publicacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          titulo: string
          tipo: 'video' | 'imagem' | 'copy' | 'story' | 'reels'
          status?: 'rascunho' | 'editando' | 'aguardando_aprovacao' | 'aprovada' | 'reprovada' | 'agendada' | 'publicada'
          responsavel_id?: string | null
          preview_url?: string | null
          duracao_segundos?: number | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          reprovado_motivo?: string | null
          data_publicacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          titulo?: string
          tipo?: 'video' | 'imagem' | 'copy' | 'story' | 'reels'
          status?: 'rascunho' | 'editando' | 'aguardando_aprovacao' | 'aprovada' | 'reprovada' | 'agendada' | 'publicada'
          responsavel_id?: string | null
          preview_url?: string | null
          duracao_segundos?: number | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          reprovado_motivo?: string | null
          data_publicacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      producao_comentarios: {
        Row: {
          id: string
          producao_id: string
          profile_id: string
          mensagem: string
          created_at: string
        }
        Insert: {
          id?: string
          producao_id: string
          profile_id: string
          mensagem: string
          created_at?: string
        }
        Update: {
          id?: string
          producao_id?: string
          profile_id?: string
          mensagem?: string
          created_at?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          id: string
          cliente_id: string
          mes: string
          valor_meta: number
          valor_atual: number
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          mes: string
          valor_meta?: number
          valor_atual?: number
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          mes?: string
          valor_meta?: number
          valor_atual?: number
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_itens: {
        Row: {
          id: string
          meta_id: string
          descricao: string
          responsavel: 'jg' | 'cliente'
          categoria: string | null
          concluido: boolean
          concluido_em: string | null
          prazo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meta_id: string
          descricao: string
          responsavel: 'jg' | 'cliente'
          categoria?: string | null
          concluido?: boolean
          concluido_em?: string | null
          prazo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meta_id?: string
          descricao?: string
          responsavel?: 'jg' | 'cliente'
          categoria?: string | null
          concluido?: boolean
          concluido_em?: string | null
          prazo?: string | null
          created_at?: string
        }
        Relationships: []
      }
      agenda_otimizacao: {
        Row: {
          id: string
          cliente_id: string
          funcionario_id: string
          data_hora: string
          descricao: string
          plataformas: string[]
          status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          funcionario_id: string
          data_hora: string
          descricao: string
          plataformas?: string[]
          status?: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          funcionario_id?: string
          data_hora?: string
          descricao?: string
          plataformas?: string[]
          status?: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'
          created_at?: string
        }
        Relationships: []
      }
      trafego_snapshots: {
        Row: {
          id: string
          cliente_id: string
          plataforma: 'meta' | 'google' | 'tiktok'
          mes: string
          investido: number
          alcance: number | null
          impressoes: number | null
          cliques: number | null
          leads: number | null
          conversoes: number | null
          roas: number | null
          cpc: number | null
          cpl: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          plataforma: 'meta' | 'google' | 'tiktok'
          mes: string
          investido?: number
          alcance?: number | null
          impressoes?: number | null
          cliques?: number | null
          leads?: number | null
          conversoes?: number | null
          roas?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          plataforma?: 'meta' | 'google' | 'tiktok'
          mes?: string
          investido?: number
          alcance?: number | null
          impressoes?: number | null
          cliques?: number | null
          leads?: number | null
          conversoes?: number | null
          roas?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      criativos: {
        Row: {
          id: string
          cliente_id: string
          nome: string
          plataforma: 'meta' | 'google' | 'tiktok'
          status: 'ativo' | 'pausado' | 'encerrado'
          thumbnail_url: string | null
          ctr: number | null
          impressoes: number | null
          cliques: number | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          nome: string
          plataforma: 'meta' | 'google' | 'tiktok'
          status?: 'ativo' | 'pausado' | 'encerrado'
          thumbnail_url?: string | null
          ctr?: number | null
          impressoes?: number | null
          cliques?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          nome?: string
          plataforma?: 'meta' | 'google' | 'tiktok'
          status?: 'ativo' | 'pausado' | 'encerrado'
          thumbnail_url?: string | null
          ctr?: number | null
          impressoes?: number | null
          cliques?: number | null
          created_at?: string
        }
        Relationships: []
      }
      nps_pesquisas: {
        Row: {
          id: string
          mes: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          mes: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          mes?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      nps_votos: {
        Row: {
          id: string
          pesquisa_id: string
          cliente_id: string
          funcionario_id: string | null
          nota: number
          comentario: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pesquisa_id: string
          cliente_id: string
          funcionario_id?: string | null
          nota: number
          comentario?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pesquisa_id?: string
          cliente_id?: string
          funcionario_id?: string | null
          nota?: number
          comentario?: string | null
          created_at?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          id: string
          cliente_id: string
          tipo: 'elogio' | 'sugestao' | 'reclamacao'
          mensagem: string
          respondido: boolean
          resposta: string | null
          respondido_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          tipo: 'elogio' | 'sugestao' | 'reclamacao'
          mensagem: string
          respondido?: boolean
          resposta?: string | null
          respondido_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          tipo?: 'elogio' | 'sugestao' | 'reclamacao'
          mensagem?: string
          respondido?: boolean
          resposta?: string | null
          respondido_em?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          id: string
          profile_id: string
          tipo: 'campanha_alerta' | 'producao_status' | 'meta_update' | 'pagamento' | 'feedback_novo' | 'geral'
          titulo: string
          mensagem: string
          lida: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          tipo: 'campanha_alerta' | 'producao_status' | 'meta_update' | 'pagamento' | 'feedback_novo' | 'geral'
          titulo: string
          mensagem: string
          lida?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          tipo?: 'campanha_alerta' | 'producao_status' | 'meta_update' | 'pagamento' | 'feedback_novo' | 'geral'
          titulo?: string
          mensagem?: string
          lida?: boolean
          created_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          profile_id: string
          token: string
          plataforma: 'ios' | 'android' | 'web'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          token: string
          plataforma: 'ios' | 'android' | 'web'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          token?: string
          plataforma?: 'ios' | 'android' | 'web'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      demandas: {
        Row: {
          id: string
          cliente_id: string | null
          responsavel_id: string
          titulo: string
          descricao: string | null
          status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
          prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
          prazo: string
          setor: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          responsavel_id?: string | null
          titulo: string
          descricao?: string | null
          status?: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
          prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
          prazo?: string | null
          setor?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string | null
          responsavel_id?: string | null
          titulo?: string
          descricao?: string | null
          status?: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
          prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
          prazo?: string
          setor?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      calcular_health_score: {
        Args: { p_cliente_id: string }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
