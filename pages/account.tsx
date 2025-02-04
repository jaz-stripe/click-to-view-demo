import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../store';
import { setUser, setHasPaymentMethod } from '../slices/userSlice';
import TopBar from '../components/TopBar';
import styles from '../styles/Account.module.css';

export default function Account() {
  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    verifyPaymentMethod();
  }, []);

  const verifyPaymentMethod = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/verify-payment-method');
      const data = await response.json();
      if (data.hasPaymentMethod) {
        dispatch(setHasPaymentMethod(true));
      } else {
        dispatch(setHasPaymentMethod(false));
      }
    } catch (error) {
      console.error('Error verifying payment method:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setIsModalOpen(true);
  };

  const handleManagePayments = async () => {
    try {
      const response = await fetch('/api/create-portal-session', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create portal session:', data);
        alert('Failed to open payment management. Please try again.');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleModalAccept = async () => {
    setIsModalOpen(false);
    try {
      const response = await fetch('/api/create-checkout-session', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session:', data);
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleModalDecline = () => {
    setIsModalOpen(false);
  };

  const handleDone = () => {
    router.push('/main');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <TopBar />
      <main className={styles.main}>
        <div className={styles.accountBox}>
          <h1 className={styles.title}>Account details</h1>
          <div className={styles.field}>
            <label>Email</label>
            <p>{user.email}</p>
            <button className={styles.changeButton}>Change email</button>
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <p>••••••••</p>
            <button className={styles.changeButton}>Change password</button>
          </div>
          <div className={styles.buttonRow}>
            <button className={styles.doneButton} onClick={handleDone}>DONE</button>
            <button 
              className={`${styles.paymentButton} ${user.hasPaymentMethod ? styles.manage : styles.add}`}
              onClick={user.hasPaymentMethod ? handleManagePayments : handleAddPaymentMethod}
            >
              {user.hasPaymentMethod ? 'Manage payments' : 'Add payment method'}
            </button>
          </div>
        </div>
      </main>
      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <p className={styles.modalText}>
              We are redirecting you input, validate and store your payment details. Managing your payment methods, purchases and invoices will be easy via the "Manage my payments" portal here. You will be billed monthly for your usage of TVNZ+ premium content.
            </p>
            <div className={styles.modalButtons}>
              <button className={styles.acceptButton} onClick={handleModalAccept}>Accept</button>
              <button className={styles.declineButton} onClick={handleModalDecline}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
