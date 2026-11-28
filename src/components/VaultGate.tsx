// Inline vault password (create or unlock) so wallet actions don't send people to another screen.
import { useState } from 'react';
import { MIN_VAULT_PASSWORD, useVault } from '../services/vault';
import { VaultError } from '../services/vaultCore';
import { useT } from '../i18n';

export default function VaultGate({ purpose }: { purpose: string }) {
  const vault = useVault();
  const t = useT();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!vault.locked) return null;
  const creating = !vault.hasVault;
  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      await vault.unlock(pw);
      setPw('');
    } catch (e) {
      const fr: Record<VaultError['code'], string> = {
        'too-short': `Utilisez au moins ${MIN_VAULT_PASSWORD} caractères.`,
        'wrong-password': 'Mot de passe incorrect.',
        damaged: 'Les données de vérification du coffre sont endommagées. Rien n’a été modifié.',
        'rate-limited': 'Une tentative de déverrouillage est déjà en cours.'
      };
      setErr(e instanceof VaultError ? t(e.message, fr[e.code]) : e instanceof Error ? e.message : t('Could not unlock.', 'Déverrouillage impossible.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="space-y-2 rounded-lg border border-ink-600 p-4" onSubmit={(e) => { e.preventDefault(); void go(); }}>
      <label className="block space-y-1 text-sm text-slate-300">
        <span>{creating ? t(`Create a vault password to ${purpose}`, `Créez un mot de passe de coffre pour ${purpose}`) : t(`Enter your vault password to ${purpose}`, `Entrez le mot de passe du coffre pour ${purpose}`)}</span>
        <input type="password" autoComplete={creating ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)}
          className="min-h-[48px] w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-white" />
      </label>
      {creating && <p className="text-xs text-slate-500">{t(`At least ${MIN_VAULT_PASSWORD} characters. It encrypts your keys on this device and cannot be recovered.`, `Au moins ${MIN_VAULT_PASSWORD} caractères. Il chiffre vos clés sur cet appareil et ne peut pas être récupéré.`)}</p>}
      {err && <p role="alert" className="text-sm text-down">{err}</p>}
      <button type="submit" disabled={busy || !pw} className="min-h-[48px] w-full rounded-full bg-white text-sm font-semibold text-ink-900 disabled:opacity-40">
        {busy ? t('Checking…', 'Vérification…') : creating ? t('Create vault', 'Créer le coffre') : t('Unlock', 'Déverrouiller')}
      </button>
    </form>
  );
}
