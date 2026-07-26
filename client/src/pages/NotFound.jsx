import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mb-5 inline-flex rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          A to Z Education
        </div>
        <h1 className="text-3xl font-bold text-gray-900">We couldn’t find that page</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">The page may have moved or no longer exists.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;