import {
  BookOpen,
  GraduationCap,
  MessageCircle,
  User,
  Youtube,
  PlayCircle,
  Eye,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <section className="rounded-2xl border border-blue-100 bg-white shadow-lg p-6 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                AtoZ Education - Anand Wagh
              </h1>
              <p className="mt-3 text-gray-600 text-sm sm:text-base">
                Empowering Students Through Education
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-blue-100 bg-white shadow-md p-6 sm:p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Description</h2>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {`विद्यार्थ्यांची स्पर्धात्मक प्रगती घडवण्यासाठी वयोगटानुसार, वर्गानुसार, इयत्तानुरुप विषयवार स्पर्धा परीक्षा अध्ययन साहित्य उपलब्ध होईल.
शैक्षणिक दृष्ट्या मुले, शिक्षक, पालक व शिक्षणाशी संबंधित घटकांसाठी उपयुक्त videos आणि इतर material या चॅनल वर उपलब्ध होईल.`}
            </p>
          </article>

          <article className="rounded-2xl border border-green-100 bg-white shadow-md p-6 sm:p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">WhatsApp</h2>
            </div>
            <p className="text-gray-700 mb-5">नियमित class साठी ग्रुप link-</p>
            <a
              href="https://chat.whatsapp.com/FtFd5b0qGs3DHKu5xvtUHH?mode=ac_t"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white shadow-md transition hover:bg-green-700 hover:shadow-lg"
            >
              Join Class
              <ExternalLink size={16} />
            </a>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-indigo-100 bg-white shadow-md p-6 sm:p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <User size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Author</h2>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-3">आपला मित्र - आनंद वाघ</p>
            <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">Qualifications</p>
            <p className="text-gray-700 leading-relaxed">
              D.ed, B.A.B.ed, M.ed, L.L.M, M.phil, TET-1, TET-2, SET (LAW)
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-white shadow-md p-6 sm:p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                <Youtube size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">YouTube</h2>
            </div>

            <div className="space-y-2 mb-5">
              <a
                href="https://www.youtube.com/@atozeducation2001anandwagh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-700 font-medium hover:text-blue-800"
              >
                <ExternalLink size={16} />
                A to Z Education
              </a>
              <a
                href="https://www.youtube.com/@anandyog2001"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-700 font-medium hover:text-blue-800"
              >
                <ExternalLink size={16} />
                Anand Yog Channel
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <PlayCircle size={14} /> Total Videos
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">613 videos</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Eye size={14} /> Total Views
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">325,440 views</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <TrendingUp size={14} /> Highlight
                </p>
                <p className="mt-1 text-lg font-extrabold text-amber-800">3,200,000+ views</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-8">
          <div className="rounded-xl border border-blue-100 bg-white/90 px-5 py-4 text-center shadow-sm">
            <p className="text-sm sm:text-base font-semibold text-gray-700">
              Built by Aditya Wagh, a Computer Science engineer
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
