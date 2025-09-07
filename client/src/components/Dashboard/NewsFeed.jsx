import React from 'react';

const NewsFeed = () => {
    // Mock News Data (Replace with NewsAPI later)
    const news = [
        { title: 'Global Deforestation Rates Drop by 2%', source: 'Nature Daily', date: '2h ago' },
        { title: 'New Satellite Tech Tracks Carbon', source: 'TechGreen', date: '5h ago' },
        { title: 'Amazon Protection Bill Passed', source: 'World News', date: '1d ago' },
        { title: 'Reforestation Projects in Asia', source: 'EcoLife', date: '2d ago' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">Environmental News</h3>
            <div className="space-y-4">
                {news.map((item, index) => (
                    <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
                        <h4 className="font-medium text-gray-800 hover:text-gg-primary cursor-pointer line-clamp-2">
                            {item.title}
                        </h4>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                            <span>{item.source}</span>
                            <span>{item.date}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full mt-4 text-sm text-gg-primary font-semibold hover:underline">
                View All News
            </button>
        </div>
    );
};

export default NewsFeed;
