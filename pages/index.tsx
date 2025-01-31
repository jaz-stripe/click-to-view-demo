import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log('Login attempted with:', email, password);
    router.push('/main');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <img src="/tvnz-plus-bg.svg" alt="TVNZ+ Logo Background" className={styles.logoBg} />
          <img src="/tvnz-plus-logo.svg" alt="TVNZ+ Logo" className={styles.logo} />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>Log in</button>
        </form>
        <button 
          onClick={() => router.push('/signup')} 
          className={styles.signupButton}
        >
          New to TVNZ+? Sign up now
        </button>
      </div>
    </div>
  );
}
