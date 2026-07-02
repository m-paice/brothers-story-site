import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStoreMembers,
  createStoreMember,
  removeStoreMember,
  type StoreMember,
  type NewStoreMember,
} from '../../lib/team';
import { TeamMemberFormModal } from '../../components/admin/TeamMemberFormModal';
import { isSupabaseConfigured } from '../../lib/supabase';

const ROLE_LABEL: Record<StoreMember['role'], string> = {
  owner: 'Dono',
  admin: 'Admin',
  staff: 'Staff',
};

export function FuncionariosAdmin() {
  const { currentStoreId, session } = useAuth();
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!currentStoreId) return;
    setLoading(true);
    fetchStoreMembers(currentStoreId)
      .then(setMembers)
      .catch((err) => console.error('Falha ao carregar equipe:', err))
      .finally(() => setLoading(false));
  };

  // Carga inicial: não seta `loading` aqui (já inicia true) para evitar
  // setState síncrono dentro do effect.
  useEffect(() => {
    if (!currentStoreId) return;
    fetchStoreMembers(currentStoreId)
      .then(setMembers)
      .catch((err) => console.error('Falha ao carregar equipe:', err))
      .finally(() => setLoading(false));
  }, [currentStoreId]);

  const handleSave = async (input: NewStoreMember) => {
    await createStoreMember(input);
    load();
  };

  const handleRemove = async (member: StoreMember) => {
    if (
      !window.confirm(`Remover ${member.nome ?? 'este funcionário'} da equipe?`)
    ) {
      return;
    }
    setError(null);
    setBusyId(member.id);
    try {
      await removeStoreMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      console.error('Falha ao remover funcionário:', err);
      setError('Não foi possível remover. Tente novamente.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Funcionários</h1>
          <p className="admin-page__subtitle">{members.length} na equipe</p>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => setModalOpen(true)}
          disabled={!isSupabaseConfigured || !currentStoreId}
          title={
            isSupabaseConfigured
              ? undefined
              : 'Configure o Supabase para gerenciar a equipe'
          }
        >
          + Novo funcionário
        </button>
      </div>

      {error && <p className="admin-banner">{error}</p>}

      {loading ? (
        <div className="admin-loading">
          <span className="admin-spinner" aria-hidden="true" />
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Desde</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.nome ?? '—'}</td>
                  <td>{ROLE_LABEL[member.role]}</td>
                  <td
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.82rem',
                    }}
                  >
                    {new Date(member.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      disabled={
                        member.role === 'owner' ||
                        member.user_id === session?.user?.id ||
                        busyId === member.id
                      }
                      onClick={() => handleRemove(member)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {currentStoreId && (
        <TeamMemberFormModal
          open={modalOpen}
          storeId={currentStoreId}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
