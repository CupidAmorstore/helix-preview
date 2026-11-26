// Audit L10N-1: French (Canada) layer.
import { describe, expect, it } from 'vitest';
import { getLang, setLang, tr } from '../i18n';
import { reasonFr } from '../paper/reasonFr';

describe('language switch', () => {
  it('defaults to English in a non-French environment and switches to French', () => {
    expect(['en', 'fr']).toContain(getLang());
    setLang('fr');
    expect(getLang()).toBe('fr');
    expect(tr('Markets', 'Marchés')).toBe('Marchés');
    setLang('en');
    expect(tr('Markets', 'Marchés')).toBe('Markets');
  });
});

describe('paper engine messages in French', () => {
  it.each([
    ['Not enough paper cash', 'Liquidités fictives insuffisantes'],
    ['Minimum order is $1', 'L’ordre minimum est de 1 $'],
    ["You don't hold any BTC", 'Vous ne détenez aucun BTC'],
    ['No sellers within 2% of the price right now', 'Aucun vendeur à moins de 2 % du prix en ce moment'],
    ['Price is out of date. Wait for a live price and try again.', 'Le prix n’est plus à jour. Attendez un prix en direct et réessayez.'],
    ['Trading paused: paused by you', 'Trading en pause : mis en pause par vous']
  ])('%s', (en, fr) => expect(reasonFr(en)).toBe(fr));

  it('unknown messages are shown unchanged rather than mistranslated', () => {
    expect(reasonFr('Something new')).toBe('Something new');
    expect(reasonFr(undefined)).toBe('');
  });
});
