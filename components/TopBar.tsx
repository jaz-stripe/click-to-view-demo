import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/TopBar.module.css';

interface TopBarProps {
  userEmoji: string;
  onLogout: () => void;
}

export default function TopBar({ userEmoji, onLogout }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAccountClick = () => {
    setIsMenuOpen(false);
    router.push('/account');
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.logoContainer}>
          <Image src="/tvnz-plus-logo.svg" alt="TVNZ+ Logo" width={100} height={50} />
        </div>
        <nav className={styles.navigation}>
          <a href="#" className={styles.navItem}>Home</a>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>Sports</a>
          <a href="#" className={styles.navItem}>News</a>
          <a href="#" className={styles.navItem}>Categories</a>
          <a href="#" className={`${styles.navItem} ${styles.premium}`}>Premium</a>
        </nav>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.userMenu} ref={menuRef}>
          <button onClick={toggleMenu} className={styles.avatarButton}>
            {userEmoji}
          </button>
          {isMenuOpen && (
            <div className={styles.dropdown}>
              <button onClick={() => console.log('Manage Profile')}>Manage Profile</button>
              <button onClick={handleAccountClick}>Account</button>
              <button onClick={() => console.log('Help')}>Help</button>
              <button onClick={onLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
