import { readPasswordToken } from '@/lib/password-link';
import { type Query, singleValues } from '@/lib/rdv';
import { requestPassword, setPassword } from '../actions';
import { Shell, Title } from '../view';
import { Submit } from '../motion';
import styles from '../events.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title:'Mot de passe · EIZO Events', robots:{index:false,follow:false}, referrer:'no-referrer' as const };

const errors: Record<string,string> = {
  lien: 'Ce lien n’est plus valable (expiré ou déjà utilisé). Demandez-en un nouveau ci-dessous.',
  mdp: 'Le mot de passe doit faire au moins 10 caractères et les deux saisies doivent être identiques.',
  compte: 'Le compte n’a pas pu être mis à jour. Réessayez ou contactez klegarrec@feeder.fr.',
};

export default async function Password({searchParams}: {searchParams:Promise<Query>}) {
  const query = singleValues(await searchParams);
  const link = query.t ? readPasswordToken(query.t) : null;
  return <Shell><section className={styles.login}>
    <div className={styles.loginIntro}>
      <p className={styles.kicker} data-reveal>Accès équipe</p>
      <Title text={link ? 'Votre mot' : 'Première'} accent={link ? 'de passe' : 'connexion'} />
      <p data-reveal>{link
        ? <>Compte : <strong>{link.email}</strong>. Choisissez un mot de passe d’au moins 10 caractères.</>
        : 'Saisissez votre adresse professionnelle : si elle a accès au back-office, vous recevez un lien pour choisir votre mot de passe.'}</p>
    </div>
    {link
      ? <form action={setPassword} className={styles.loginForm} data-reveal>
          {query.erreur && <p role="alert" className={styles.alert}>{errors[query.erreur] ?? errors.lien}</p>}
          <input type="hidden" name="t" value={query.t} />
          <label>Nouveau mot de passe<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          <label>Confirmer<input name="confirm" type="password" autoComplete="new-password" minLength={10} required /></label>
          <Submit magnet pending="Connexion…">Enregistrer et me connecter <span>↗</span></Submit>
        </form>
      : <form action={requestPassword} className={styles.loginForm} data-reveal>
          {query.envoye && <p role="status" className={styles.sent}>Si cette adresse a accès au back-office, un e-mail vient d’être envoyé. Pensez à vérifier les indésirables.</p>}
          {query.erreur && <p role="alert" className={styles.alert}>{errors[query.erreur] ?? errors.lien}</p>}
          <label>Adresse professionnelle<input name="email" type="email" autoComplete="username" required /></label>
          <Submit magnet pending="Envoi…">Recevoir mon lien <span>↗</span></Submit>
          <a className={styles.formLink} href="/events">← Retour à la connexion</a>
        </form>}
  </section></Shell>;
}
