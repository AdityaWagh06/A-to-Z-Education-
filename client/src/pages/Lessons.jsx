import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ReactPlayer from 'react-player';

const getYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const Lessons = () => {
    const { subject } = useParams();
    const [searchParams] = useSearchParams();
    const standard = searchParams.get('standard');
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        const standardQuery = standard ? `&standard=${standard}` : '';
        axios.get(`http://localhost:5000/api/videos?subject=${subject}${standardQuery}`)
            .then(res => {
                setVideos(res.data);
                if (res.data.length > 0) setSelectedVideo(res.data[0]);
            })
            .catch(err => console.error(err));
    }, [subject, standard]);

    const handleNextLesson = () => {
        if (!selectedVideo || videos.length === 0) return;
        const currentIndex = videos.findIndex(v => v._id === selectedVideo._id);
        
        if (currentIndex !== -1 && currentIndex < videos.length - 1) {
            setSelectedVideo(videos[currentIndex + 1]);
        }
    };

    const handlePrevLesson = () => {
        if (!selectedVideo || videos.length === 0) return;
        const currentIndex = videos.findIndex(v => v._id === selectedVideo._id);
        
        if (currentIndex > 0) {
            setSelectedVideo(videos[currentIndex - 1]);
        }
    };

    const isFirstVideo = selectedVideo && videos.length > 0 && videos[0]._id === selectedVideo._id;
    const isLastVideo = selectedVideo && videos.length > 0 && videos[videos.length - 1]._id === selectedVideo._id;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Sidebar List */}
            <div className="w-1/4 bg-white border-r border-gray-300 overflow-y-auto hidden md:block shadow-sm">
                <div className="p-4 font-bold text-lg border-b border-gray-300 capitalize sticky top-0 bg-white z-10 shadow-sm text-gray-800">{subject} Lessons</div>
                <ul>
                    {videos.map(video => {
                        const videoId = getYouTubeID(video.youtubeUrl);
                        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
                        const isSelected = selectedVideo?._id === video._id;

                        return (
                            <li 
                                key={video._id} 
                                onClick={() => setSelectedVideo(video)}
                                className={`p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                            >
                                {thumbnailUrl && (
                                    <div className={`flex-shrink-0 w-24 h-16 bg-gray-200 rounded overflow-hidden relative border ${isSelected ? 'border-primary' : 'border-gray-300'} shadow-sm`}>
                                        <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                                    </div>
                                )}
                                <div className="flex flex-col justify-center w-full">
                                    <h4 className={`font-semibold text-sm line-clamp-2 leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{video.title}</h4>
                                    <div className="flex justify-between items-center mt-1">
                                         <span className="text-xs text-gray-400">{video.duration || '10 mins'}</span>
                                         {isSelected && <span className="text-xs font-bold text-primary">Playing</span>}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
                {selectedVideo ? (
                    <div className="max-w-4xl mx-auto"> {/* Adjusted for better fit */}
                        {/* Aspect Ratio Wrapper (16:9) */}
                        <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden shadow-2xl bg-black border border-gray-800 ring-4 ring-gray-200/50 group">
                            {/* Overlay to block YouTube title interaction */}
                            <div className="absolute top-0 left-0 w-full h-16 z-20 bg-transparent cursor-default"></div>

                            <ReactPlayer 
                                url={selectedVideo.youtubeUrl} 
                                className="absolute top-0 left-0"
                                width="100%" 
                                height="100%"
                                controls={true}
                                config={{
                                    youtube: {
                                        playerVars: { 
                                            showinfo: 0, 
                                            rel: 0, 
                                            modestbranding: 1,
                                            origin: window.location.origin
                                        }
                                    }
                                }}
                                onEnded={() => {
                                    // Optional: Auto-advance (uncomment if desired by user, otherwise manual 'Next Lesson' works)
                                    // handleNextLesson();
                                }}
                            />
                        </div>
                        <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h1 className="text-2xl font-bold text-gray-800">{selectedVideo.title}</h1>
                            <p className="text-gray-600 mt-2 leading-relaxed">{selectedVideo.description || 'Watch and learn key concepts in this lesson.'}</p>
                            
                            <div className="mt-8 flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <button 
                                    onClick={handlePrevLesson}
                                    disabled={isFirstVideo}
                                    className={`
                                        flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all duration-200
                                        ${isFirstVideo 
                                            ? 'opacity-50 cursor-not-allowed text-gray-400 bg-transparent' 
                                            : 'bg-white text-gray-700 hover:text-primary hover:bg-blue-50 border border-gray-300 hover:border-blue-200 shadow-sm hover:shadow-md'}
                                    `}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Previous
                                </button>

                                <span className="text-sm font-medium text-gray-500">
                                    {videos.length > 0 && selectedVideo && (
                                        `Lesson ${videos.findIndex(v => v._id === selectedVideo._id) + 1} of ${videos.length}`
                                    )}
                                </span>

                                <button 
                                    onClick={handleNextLesson}
                                    disabled={isLastVideo}
                                    className={`
                                        flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all duration-200 shadow-md
                                        ${isLastVideo 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                            : 'bg-primary hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300 hover:translate-x-1'}
                                    `}
                                >
                                    {isLastVideo ? 'Finish' : 'Next'}
                                    {!isLastVideo && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                        <div className="text-6xl mb-4 grayscale">📺</div>
                        <p className="text-xl font-medium">Select a lesson from the sidebar to start learning.</p>
                   </div>
                )}
            </div>
        </div>
    );
};

export default Lessons;
