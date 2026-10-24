import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { sincronizacaoService } from '../../application/services/sincronizacao.service';
import { ResultadoSincronizacao } from '../../application/interfaces/sincronizador-rascunhos.interface';

function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/**
 * Monta o aviso do resultado. Na sincronização automática, só avisa o que pede atenção
 * (descartes, renumerações e falhas que não são falta de conexão).
 */
function mensagemDoResultado(resultado: ResultadoSincronizacao, manual: boolean): string | null {
  const linhas: string[] = [];
  if (manual && resultado.enviados > 0) {
    linhas.push(`${plural(resultado.enviados, 'rascunho enviado', 'rascunhos enviados')} ao servidor.`);
  }
  for (const r of resultado.renumerados) {
    linhas.push(`O número ${r.numeroAnterior} já existia; o rascunho foi salvo como ${r.numeroNovo}.`);
  }
  for (const d of resultado.descartados) linhas.push(d.mensagem);
  for (const f of resultado.falhas) {
    if (f.semConexao) {
      if (manual) linhas.push('Sem conexão com o servidor. Os rascunhos continuam salvos no aparelho.');
    } else {
      linhas.push(`Não foi possível enviar ${f.numero}: ${f.mensagem}`);
    }
  }
  return linhas.length > 0 ? linhas.join('\n\n') : null;
}

/**
 * Sincronização dos rascunhos (RF85, RF86) e contagem de pendentes (RNF40).
 * Sincroniza ao entrar no app com conexão, quando a conexão volta, quando o app volta
 * ao primeiro plano e quando o usuário pede.
 */
export function useSincronizacao(online: boolean, chaveDeTela: string) {
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const onlineRef = useRef(online);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  const contar = () => sincronizacaoService.contarPendentes().catch(() => 0);

  const executar = useCallback(async (manual: boolean) => {
    setSincronizando(true);
    try {
      const resultado = await sincronizacaoService.sincronizar();
      const mensagem = mensagemDoResultado(resultado, manual);
      if (mensagem) Alert.alert('Sincronização', mensagem);
    } catch (err) {
      if (manual) Alert.alert('Sincronização', err instanceof Error ? err.message : 'Falha ao sincronizar.');
    } finally {
      setSincronizando(false);
      setPendentes(await contar());
    }
  }, []);

  /** Sincroniza só se houver rascunhos pendentes. */
  const sincronizarSeHouverPendentes = useCallback(
    (manual: boolean) =>
      contar().then((quantidade) => {
        setPendentes(quantidade);
        if (quantidade > 0) return executar(manual);
        if (manual) Alert.alert('Sincronização', 'Não há rascunhos pendentes.');
      }),
    [executar]
  );

  // Ao entrar com conexão e sempre que ela volta.
  useEffect(() => {
    if (online) sincronizarSeHouverPendentes(false);
  }, [online, sincronizarSeHouverPendentes]);

  // Ao voltar o app para o primeiro plano.
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && onlineRef.current) sincronizarSeHouverPendentes(false);
    });
    return () => assinatura.remove();
  }, [sincronizarSeHouverPendentes]);

  // A cada troca de tela: rascunhos podem ter sido criados ou alterados.
  useEffect(() => {
    let ativo = true;
    contar().then((quantidade) => {
      if (ativo) setPendentes(quantidade);
    });
    return () => {
      ativo = false;
    };
  }, [chaveDeTela]);

  return { pendentes, sincronizando, sincronizarAgora: () => sincronizarSeHouverPendentes(true) };
}
