import { Section } from '../../../lib/ui/Section/Section'
import { useAuthContext } from '../../contexts/AuthContext'
import styles from './HomeScreen.module.scss'

export const HomeScreen = () => {
  const { currentAccount } = useAuthContext()

  return (
    <section className={styles.screen} aria-labelledby="home-title">
      <header className={styles.header}>
        <p>{currentAccount?.email}</p>
        <h2 id="home-title">Welcome to Dynamic Links</h2>
      </header>

      <Section title="Journey">
        <p className={styles.copy}>
          Your Link Code workspace is ready. Create, manage, and inspect Dynamic Links here as workflows land.
        </p>
      </Section>
    </section>
  )
}
