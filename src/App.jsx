import { useTranslation } from 'react-i18next';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();

  // Dil değiştirme fonksiyonu
  const toggleLanguage = () => {
    const newLang = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(newLang);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>BookShelf 📚</h1>
      <p>{t('welcome')}</p>
      
      <button 
        onClick={toggleLanguage}
        style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}
      >
        {t('changeLang')}
      </button>
    </div>
  );
}

export default App;