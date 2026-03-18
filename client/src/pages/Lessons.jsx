import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ReactPlayer from 'react-player';

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

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar List */}
            <div className="w-1/4 bg-white border-r overflow-y-auto hidden md:block">
                <div className="p-4 font-bold text-lg border-b capitalize">{subject} Lessons</div>
                <ul>
                    {videos.map(video => (
                        <li 
                            key={video._id} 
                            onClick={() => setSelectedVideo(video)}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${selectedVideo?._id === video._id ? 'bg-blue-50 border-l-4 border-primary' : ''}`}
                        >
                            <h4 className="font-semibold text-sm">{video.title}</h4>
                            <span className="text-xs text-gray-500">{video.duration || '10 mins'}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
                {selectedVideo ? (
                    <div className="max-w-4xl mx-auto">
                        <div className="aspect-w-16 aspect-h-9 rounded-card overflow-hidden shadow-lg bg-black">
                            <ReactPlayer 
                                url={selectedVideo.youtubeUrl} 
                                width="100%" 
                                height="100%"
                                controls={true}
                            />
                        </div>
                        <h1 className="text-2xl font-bold mt-6">{selectedVideo.title}</h1>
                        <p className="text-gray-600 mt-2">{selectedVideo.description || 'Watch and learn key concepts in this lesson.'}</p>
                        
                        <div className="mt-8 flex gap-4">
                            <button className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">
                                Mark as Completed
                            </button>
                            <button className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-2 px-6 rounded-lg transition">
                                Next Lesson
                            </button>
                        </div>
                    </div>
                ) : (
                   <div className="flex items-center justify-center h-full text-gray-500">Select a lesson to start learning.</div>
                )}
            </div>
        </div>
    );
};

export default Lessons;
