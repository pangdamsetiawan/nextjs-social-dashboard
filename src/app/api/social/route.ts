import { NextResponse } from 'next/server';
import { SocialProfile, ContentData } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface YTPlaylistItem {
  snippet: {
    resourceId: {
      videoId: string;
    };
  };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
  };
  statistics: {
    viewCount: string;
  };
}

interface IGEdge {
  node: {
    id: string;
    shortcode: string;
    is_video: boolean;
    video_view_count?: number;
    edge_media_to_caption?: {
      edges?: Array<{
        node: {
          text: string;
        };
      }>;
    };
    edge_liked_by?: {
      count: number;
    };
  };
}

interface TikTokVideoItem {
  id: string;
  desc: string;
  stats: {
    playCount: number;
  };
}

async function getYouTubeData(channelInput: string): Promise<SocialProfile> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY tidak ditemukan.");
  }

  let channelDataUrl = "";
  if (channelInput.startsWith('UC')) {
    channelDataUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelInput}&key=${YOUTUBE_API_KEY}`;
  } else {
    const handle = channelInput.startsWith('@') ? channelInput : `@${channelInput}`;
    channelDataUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${handle}&key=${YOUTUBE_API_KEY}`;
  }

  const channelRes = await fetch(channelDataUrl);
  const channelJson = await channelRes.json();

  if (!channelJson.items || channelJson.items.length === 0) {
    throw new Error(`Channel YouTube "${channelInput}" tidak ditemukan.`);
  }

  const channel = channelJson.items[0];
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

  const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5&key=${YOUTUBE_API_KEY}`);
  const playlistJson = await playlistRes.json();

  if (!playlistJson.items || playlistJson.items.length === 0) {
    return {
      platform: 'youtube',
      username: channelInput,
      accountName: channel.snippet.title,
      profilePicture: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
      totalViews: parseInt(channel.statistics.viewCount, 10),
      recentContent: [],
    };
  }

  const videoIds = (playlistJson.items as YTPlaylistItem[]).map((item) => item.snippet.resourceId.videoId).join(',');
  const videoStatsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`);
  const videoStatsJson = await videoStatsRes.json();

  const recentContent: ContentData[] = (videoStatsJson.items as YTVideoItem[]).map((item) => ({
    id: item.id,
    title: item.snippet.title,
    views: parseInt(item.statistics.viewCount || '0', 10),
    url: `https://www.youtube.com/watch?v=${item.id}`
  }));

  return {
    platform: 'youtube',
    username: channelInput,
    accountName: channel.snippet.title,
    profilePicture: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
    totalViews: parseInt(channel.statistics.viewCount, 10),
    recentContent: recentContent
  };
}

async function getInstagramData(usernameInput: string): Promise<SocialProfile> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    throw new Error("API Key Instagram belum dikonfigurasi.");
  }

  const username = usernameInput.replace('@', '');
  const url = `https://${apiHost}/profile?username=${username}`;

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    }
  };

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok || !data || data.status === false) {
    throw new Error(`Akun Instagram "${username}" tidak ditemukan atau private.`);
  }

  const rawPosts = data.edge_owner_to_timeline_media?.edges || [];
  const recentContent: ContentData[] = rawPosts.slice(0, 5).map((edge: IGEdge) => {
    const node = edge.node;
    const rawCaption = node.edge_media_to_caption?.edges?.[0]?.node?.text || 'Tanpa Caption';
    const title = rawCaption.length > 60 ? rawCaption.substring(0, 60) + '...' : rawCaption;
    const viewCount = node.is_video ? (node.video_view_count || 0) : (node.edge_liked_by?.count || 0);

    return {
      id: node.id,
      title: title,
      views: viewCount,
      url: `https://www.instagram.com/p/${node.shortcode}/`
    };
  });
  const estimatedTotalViews = recentContent.reduce((sum, item) => sum + item.views, 0);

  return {
    platform: 'instagram',
    username: usernameInput,
    accountName: data.full_name || username,
    profilePicture: data.profile_pic_url_hd || data.profile_pic_url,
    totalViews: estimatedTotalViews,
    recentContent: recentContent
  };
}

async function getTikTokData(usernameInput: string): Promise<SocialProfile> {
  const apiKey = process.env.TIKTOK_RAPIDAPI_KEY;
  const apiHost = process.env.TIKTOK_RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    throw new Error("API Key TikTok belum dikonfigurasi.");
  }

  const username = usernameInput.replace('@', '');
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    }
  };

  const infoUrl = `https://${apiHost}/api/user/info?uniqueId=${username}`;
  const infoResponse = await fetch(infoUrl, options);
  const infoJson = await infoResponse.json();

  if (!infoResponse.ok || !infoJson.userInfo) {
    console.error("TikTok API Info Error:", infoJson); 
    throw new Error(`Gagal mengambil profil TikTok "${username}".`);
  }

  const user = infoJson.userInfo.user;
  const stats = infoJson.userInfo.stats;
  const secUid = user.secUid; 

  const postsUrl = `https://${apiHost}/api/user/posts?secUid=${secUid}&count=5`;
  const postsResponse = await fetch(postsUrl, options);
  const postsJson = await postsResponse.json();

  let recentContent: ContentData[] = [];

  if (postsResponse.ok && postsJson.data && postsJson.data.itemList) {
    recentContent = postsJson.data.itemList.slice(0, 5).map((item: TikTokVideoItem) => {
      const title = item.desc ? (item.desc.length > 60 ? item.desc.substring(0, 60) + '...' : item.desc) : 'Tanpa Caption';
      return {
        id: item.id,
        title: title,
        views: item.stats?.playCount || 0,
        url: `https://www.tiktok.com/@${user.uniqueId}/video/${item.id}`
      };
    });
  } else {
    console.error("TikTok API Posts Error:", postsJson);
  }

  return {
    platform: 'tiktok',
    username: usernameInput,
    accountName: user.nickname || usernameInput,
    profilePicture: user.avatarLarger || user.avatarMedium,
    totalViews: stats.heartCount || 0, 
    recentContent: recentContent
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, username } = body;

    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform dan username wajib diisi' }, { status: 400 });
    }

    if (platform === 'youtube') {
      try {
        const data = await getYouTubeData(username);
        return NextResponse.json(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mengambil data YouTube';
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
    }

    if (platform === 'instagram') {
      try {
        const data = await getInstagramData(username);
        return NextResponse.json(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mengambil data Instagram';
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
    }

    if (platform === 'tiktok') {
      try {
        const data = await getTikTokData(username);
        return NextResponse.json(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mengambil data TikTok';
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Platform tidak didukung' }, { status: 400 });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}