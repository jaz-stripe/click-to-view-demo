import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../store';
import { SimplifiedProvider } from '../components/SimplifiedContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <SimplifiedProvider>
        <Component {...pageProps} />
      </SimplifiedProvider>
    </Provider>
  );
}

export default MyApp;
