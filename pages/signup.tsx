import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Signup.module.css';
import { famousKiwis } from '../data/famousKiwis';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [confirmPassword, setConfirmPassword] = useState('password');
  const [emoji, setEmoji] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const randomKiwi = famousKiwis[Math.floor(Math.random() * famousKiwis.length)];
    setFirstName(randomKiwi.firstName);
    setLastName(randomKiwi.lastName);
    setEmoji(randomKiwi.emoji);
    
    const baseEmail = process.env.NEXT_PUBLIC_DEFAULT_EMAIL || '';
    if (baseEmail) {
      const [localPart, domain] = baseEmail.split('@');
      setEmail(`${localPart}+${randomKiwi.firstName.toLowerCase()}@${domain}`);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, emoji }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('User registered and logged in successfully');
        router.push('/main');
      } else {
        setError(data.message || 'Error registering user');
      }
    } catch (error) {
      console.error('Error registering user:', error);
      setError('An error occurred during registration');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.signupBox}>
        <div className={styles.logoContainer}>
          <img src="/tvnz-plus-bg.svg" alt="TVNZ+ Logo Background" className={styles.logoBg} />
          <img src="/tvnz-plus-logo.svg" alt="TVNZ+ Logo" className={styles.logo} />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className={styles.input}
          />
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
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>Create account</button>
        </form>
        <button 
          onClick={() => router.push('/')} 
          className={styles.loginButton}
        >
          Already have an account? Log in
        </button>
      </div>
    </div>
  );
}
