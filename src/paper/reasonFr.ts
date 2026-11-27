// French display text for paper-engine messages (the ledger records the English text; only display is translated).
const RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Trading paused: paused by you$/, () => 'Trading en pause : mis en pause par vous'],
  [/^Trading paused: (.*)$/, (m) => `Trading en pause : ${m[1]}`],
  [/^No valid live price for this coin$/, () => 'Aucun prix en direct valide pour cette crypto'],
  [/^Price is out of date\. Wait for a live price and try again\.$/, () => 'Le prix n’est plus à jour. Attendez un prix en direct et réessayez.'],
  [/^Price time is in the future; check the device clock\.$/, () => 'L’heure du prix est dans le futur; vérifiez l’horloge de l’appareil.'],
  [/^Enter an amount$/, () => 'Entrez un montant'],
  [/^Minimum order is \$(.*)$/, (m) => `L’ordre minimum est de ${m[1]} $`],
  [/^Not enough paper cash$/, () => 'Liquidités fictives insuffisantes'],
  [/^Position limit: one coin can be at most (\d+)% of your account/, (m) => `Limite de position : une crypto peut représenter au plus ${m[1]} % de votre compte`],
  [/^No sellers within (.*)% of the price right now$/, (m) => `Aucun vendeur à moins de ${m[1]} % du prix en ce moment`],
  [/^No buyers within (.*)% of the price right now$/, (m) => `Aucun acheteur à moins de ${m[1]} % du prix en ce moment`],
  [/^You don't hold any (.*)$/, (m) => `Vous ne détenez aucun ${m[1]}`],
  [/^Partly filled/, () => 'Exécuté en partie']
];

export function reasonFr(en: string | undefined): string {
  if (!en) return '';
  for (const [re, f] of RULES) {
    const m = en.match(re);
    if (m) return f(m);
  }
  return en; // unknown message: show the original rather than a wrong translation
}
