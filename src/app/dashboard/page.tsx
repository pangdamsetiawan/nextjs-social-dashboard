'use client';

import { useState } from 'react';
import { SocialProfile } from '@/types';

export default function Home() {
  const [inputs, setInputs] = useState({
    youtube: '',
    instagram: '',
    tiktok: ''
  });
  const [data, setData] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFetchData = async () => {
    setLoading(true);
    setData([]); 
    
    const platforms = ['youtube', 'instagram', 'tiktok'] as const;
    const results: SocialProfile[] = [];

    for (const platform of platforms) {
      const username = inputs[platform];
      if (username) {
        try {
          const res = await fetch('/api/social', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ platform, username }),
          });

          if (res.ok) {
            const profileData = await res.json();
            results.push(profileData);
          } else {
            console.error(`Gagal mengambil data untuk ${platform}`);
          }
        } catch (error) {
          console.error(`Error saat fetch ${platform}:`, error);
        }
      }
    }

    setData(results);
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-2 text-center text-blue-900">Social Insights</h1>
        <p className="text-center text-gray-500 mb-10">Technical Test Dashboard - Web Developer</p>
        
        {/* Input Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">YouTube Channel</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="@username atau ID"
                value={inputs.youtube}
                onChange={(e) => setInputs({...inputs, youtube: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Instagram</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                placeholder="Username saja"
                value={inputs.instagram}
                onChange={(e) => setInputs({...inputs, instagram: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">TikTok</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                placeholder="Username saja"
                value={inputs.tiktok}
                onChange={(e) => setInputs({...inputs, tiktok: e.target.value})} 
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={handleFetchData}
              disabled={loading}
              className={`px-10 py-3 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing Data...
                </span>
              ) : 'Tampilkan Data'}
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        {data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.map((profile, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="relative w-16 h-16 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={profile.profilePicture} 
                        alt={profile.accountName} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                        referrerPolicy="no-referrer"
                        // Perbaikan: crossOrigin dihapus, ditambahkan penanganan infinite loop
                        onError={(e) => {
                          e.currentTarget.onerror = null; 
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${profile.username}&background=2563EB&color=fff&bold=true`;
                        }}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <h2 className="text-xl font-black text-gray-800 capitalize leading-tight truncate">{profile.platform}</h2>
                      <p className="text-blue-600 font-medium text-sm truncate">@{profile.username}</p>
                    </div>
                  </div>
                  
                  <div className="mb-8 p-5 bg-linear-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Views</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tight">
                      {profile.totalViews.toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                      Konten Terbaru
                    </h3>
                    <ul className="space-y-4">
                      {profile.recentContent.map((content) => (
                        <li key={content.id} className="flex justify-between items-center group cursor-pointer">
                          <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors line-clamp-1 flex-1 pr-4" title={content.title}>
                            {content.title}
                          </span>
                          <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                            {content.views.toLocaleString('id-ID')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Footer/Empty State */}
        {!loading && data.length === 0 && (
          <div className="text-center py-20 bg-gray-100/50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Input username untuk menganalisis statistik media sosial</p>
          </div>
        )}
      </div>
    </main>
  );
}