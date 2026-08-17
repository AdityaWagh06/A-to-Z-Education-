import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import StudentHome from './pages/StudentHome';
import Subjects from './pages/Subjects';
import Lessons from './pages/Lessons';
import Test from './pages/Test';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';

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
        <main className="flex-1">
          <ErrorBoundary fullScreen={false}>
            <Routes>
              <Route path="/" element={!user ? <Landing /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/student/home"} replace />} />
              <Route path="/about" element={<About />} />

              <Route path="/student/home" element={<ProtectedRoute><StudentHome /></ProtectedRoute>} />
              <Route path="/student/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
              <Route path="/student/tests" element={<ProtectedRoute><Test /></ProtectedRoute>} />
              <Route path="/student/tests/:standard" element={<ProtectedRoute><Test /></ProtectedRoute>} />
              <Route path="/student/lessons/:subject" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
              <Route path="/student/test/:subject" element={<ProtectedRoute><Test /></ProtectedRoute>} />
              <Route path="/student/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </main>
        {user && (
          <footer className="bg-white border-t border-gray-200 py-4 mt-auto text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>© {new Date().getFullYear()} A to Z Education. All rights reserved.</p>
              <p className="font-medium text-gray-600">Built by Aditya Wagh, a Computer Science engineer</p>
            </div>
          </footer>
        )}
      </div>
    </Router>
  );
}

export default App;
