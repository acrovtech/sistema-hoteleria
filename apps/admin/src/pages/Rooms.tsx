import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Rooms() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => (await api.get('/rooms')).data,
  });
  if (isLoading) return <p>Cargando habitaciones…</p>;
  if (isError) return <p>Error al cargar habitaciones</p>;
  return (
    <div>
      <h1>Habitaciones</h1>
      <pre>{JSON.stringify(data ?? [], null, 2)}</pre>
    </div>
  );
}
