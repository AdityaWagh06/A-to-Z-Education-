import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import StudentHome from './pages/StudentHome';
import Subjects from './pages/Subjects';
import Lessons from './pages/Lessons';
import Test from './pages/Test';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

function App() {
  const { user } = useAuth();

  const ProtectedRoute = ({ children, role }) => {
    if (!user) return <Navigate to="/" replace />;
    if (role && user.role !== role) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-background font-sans text-gray-800">
        <Navbar />
        <Routes>
          <Route path="/" element={!user ? <Landing /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/student/home"} replace />} />
          
          <Route path="/student/home" element={<ProtectedRoute><StudentHome /></ProtectedRoute>} />
          <Route path="/student/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/student/lessons/:subject" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
          <Route path="/student/test/:subject" element={<ProtectedRoute><Test /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
