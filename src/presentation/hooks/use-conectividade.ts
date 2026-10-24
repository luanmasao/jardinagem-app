import { useEffect, useState } from 'react';
import { conectividadeProvider } from '../../infrastructure/offline/expo-network-conectividade.provider';

/**
 * Estado de conexão do dispositivo (D-OFF-08). Começa como online para não piscar o aviso
 * enquanto o primeiro estado não chega.
 */
export function useConectividade(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let ativo = true;
    conectividadeProvider.estaOnline().then((valor) => {
      if (ativo) setOnline(valor);
    });
    const cancelar = conectividadeProvider.observar(setOnline);
    return () => {
      ativo = false;
      cancelar();
    };
  }, []);

  return online;
}
