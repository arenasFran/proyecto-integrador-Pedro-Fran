import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { RegisterPage } from './pages/public/RegisterPage';
import { RecoveryPage } from './pages/public/RecoveryPage';
import LoginPage from './pages/public/LoginPage';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPageWrapper />} />
          <Route path="/recovery" element={<RecoveryPage />} />
          <Route path="/" element={<RegisterPageWrapper />} />
        </Routes>
      </Router>
    </Provider>
  );
}

function RegisterPageWrapper() {
  const navigate = useNavigate();
  
  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  return <RegisterPage onNavigateToLogin={handleNavigateToLogin} />;
}

export default App;