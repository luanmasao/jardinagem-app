import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/auth-context';
import { orcamentoService } from '../../application/services/orcamento.service';

/**
 * Logout com aviso quando há rascunhos não sincronizados (RF87):
 * sair apaga os dados do aparelho, inclusive esses rascunhos (RNF38).
 */
export function useSairComAviso(): () => Promise<void> {
  const { signOut } = useAuth();

  return useCallback(async () => {
    const pendentes = await orcamentoService.contarRascunhosPendentes();
    if (pendentes === 0) {
      await signOut();
      return;
    }
    Alert.alert(
      'Rascunhos não sincronizados',
      pendentes === 1
        ? 'Há 1 rascunho salvo só neste aparelho. Se você sair agora, ele será apagado e não poderá ser recuperado.'
        : `Há ${pendentes} rascunhos salvos só neste aparelho. Se você sair agora, eles serão apagados e não poderão ser recuperados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair e apagar', style: 'destructive', onPress: () => signOut() },
      ]
    );
  }, [signOut]);
}
