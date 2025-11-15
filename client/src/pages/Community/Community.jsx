import { useState, useEffect, useRef } from 'react';
import api from '../../api/index';
import Sidebar from '../../components/Sidebar';
import { Search, X, Plus, Users, ChevronRight, AlertCircle } from 'lucide-react';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', 
    year: 'numeric', hour: '2-digit', 
    minute: '2-digit'
  });

// ─── Poll Component ───────────────────────────
const PollPost = ({ 
  post, currentUserId, onVote, onEndPoll 
}) => {
  const poll = post.poll;
  const totalVotes = poll.options.reduce(
    (s, o) => s + o.votes.length, 0
  );
  return (
    <div className="mt-3 bg-green-50 rounded-lg 
      p-3 border border-green-200">
      <p className="font-semibold text-green-900 
        mb-3 text-sm">
        📊 {poll.question}
      </p>
      <div className="space-y-2">
        {poll.options.map((opt, idx) => {
          const pct = totalVotes > 0 
            ? Math.round(
                (opt.votes.length/totalVotes)*100
              ) 
            : 0;
          const voted = opt.votes.some(
            v => v.toString() === currentUserId
          );
          return (
            <div key={idx}>
              <button
                onClick={() => 
                  poll.isActive && onVote(idx)
                }
                disabled={!poll.isActive}
                className={`w-full text-left px-3 
                  py-2 rounded-lg border text-sm
                  transition
                  ${voted 
                    ? 'border-green-600 bg-green-100'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                  }
                  ${!poll.isActive ? 'cursor-default' : ''}
                `}
              >
                <div className="flex justify-between 
                  mb-1">
                  <span>{opt.text}</span>
                  <span className="font-bold 
                    text-green-700">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 
                  rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 
                      rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center 
        justify-between text-xs text-gray-500">
        <span>{totalVotes} votes</span>
        <span className={poll.isActive 
          ? 'text-green-600 font-medium' 
          : 'text-red-500 font-medium'
        }>
          {poll.isActive ? 'Active' : 'Ended'}
        </span>
      </div>
      {post.authorId === currentUserId && 
        poll.isActive && (
        <button
          onClick={onEndPoll}
          className="mt-2 text-xs text-red-500 
            hover:text-red-700 underline"
        >
          End Poll
        </button>
      )}
    </div>
  );
};

// ─── Post Card ────────────────────────────────
const PostCard = ({ 
  post, currentUserId, communityId,
  onLike, onComment, onDelete, onVote, onEndPoll
}) => {
  const [showComments, setShowComments] = 
    useState(false);
  const [commentText, setCommentText] = useState('');
  const isLiked = post.likes?.some(
    id => id.toString() === currentUserId
  );

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post._id, commentText);
    setCommentText('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm 
      border border-gray-100 p-4 mb-4">
      <div className="flex items-center 
        justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full 
            bg-green-700 flex items-center 
            justify-center text-white font-bold 
            text-sm">
            {post.authorName?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800 
              text-sm">
              {post.authorName}
            </p>
            <p className="text-xs text-gray-400">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
        {post.authorId?.toString() === 
          currentUserId && (
          <button
            onClick={() => onDelete(post._id)}
            className="text-xs text-gray-400 
              hover:text-red-500"
          >
            Delete
          </button>
        )}
      </div>

      {post.type === 'news_share' && (
        <span className="text-xs bg-blue-50 
          text-blue-700 px-2 py-0.5 rounded-full 
          mb-2 inline-block">
          📰 Shared News
        </span>
      )}

      {post.content && (
        <p className="text-gray-700 text-sm mb-3">
          {post.content}
        </p>
      )}

      {post.type === 'image' && post.image?.data && (
        <img
          src={`data:${post.image.mimetype};base64,${post.image.data}`}
          alt="Post"
          className="w-full rounded-lg mb-3 
            max-h-96 object-cover"
        />
      )}

      {post.type === 'news_share' && 
        post.newsData && (
        <div className="border border-blue-200 
          rounded-lg p-3 bg-blue-50 mb-3">
          <p className="font-semibold text-blue-900 
            text-sm mb-1">
            {post.newsData.title}
          </p>
          <p className="text-xs text-blue-700 mb-2">
            {post.newsData.description}
          </p>
          <div className="flex items-center 
            justify-between">
            <span className="text-xs text-gray-500">
              {post.newsData.source}
            </span>
            <a href={post.newsData.url} 
              target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 
                underline">
              Read Original
            </a>
          </div>
        </div>
      )}

      {post.type === 'poll' && post.poll && (
        <PollPost
          post={post}
          currentUserId={currentUserId}
          onVote={(idx) => onVote(post._id, idx)}
          onEndPoll={() => onEndPoll(post._id)}
        />
      )}

      <div className="flex items-center gap-4 
        mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center gap-1 
            text-sm transition
            ${isLiked 
              ? 'text-red-500' 
              : 'text-gray-400 hover:text-red-400'
            }`}
        >
          {isLiked ? '❤️' : '🤍'}
          <span>{post.likes?.length || 0}</span>
        </button>
        <button
          onClick={() => 
            setShowComments(!showComments)
          }
          className="flex items-center gap-1 
            text-sm text-gray-400 
            hover:text-green-600"
        >
          💬 <span>
            {post.comments?.length || 0}
          </span>
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2">
          {post.comments?.map((c, i) => (
            <div key={i} className="bg-gray-50 
              rounded-lg p-2">
              <span className="font-semibold 
                text-xs text-green-800">
                {c.authorName}
              </span>
              <span className="text-xs 
                text-gray-600 ml-2">
                {c.content}
              </span>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={commentText}
              onChange={e => 
                setCommentText(e.target.value)
              }
              onKeyDown={e => 
                e.key === 'Enter' && submitComment()
              }
              placeholder="Write a comment..."
              className="flex-1 text-sm border 
                border-gray-200 rounded-lg px-3 
                py-1.5 focus:outline-none 
                focus:border-green-500"
            />
            <button
              onClick={submitComment}
              className="bg-green-700 text-white 
                text-sm px-3 py-1.5 rounded-lg 
                hover:bg-green-800"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Community Detail ─────────────────────────
const CommunityDetail = ({ 
  community, currentUser, onBack 
}) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postType, setPostType] = useState('text');
  const [postContent, setPostContent] = useState('');
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['','']);
  const [imgData, setImgData] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const fileRef = useRef();

  const currentUserId = 
    currentUser?.id || currentUser?._id;
  const isCreator = 
    community.creatorId?.toString() === currentUserId;

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get(
        `/community/communities/${community._id}/posts`
      );
      setPosts(res.data);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const selectImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert('Max 100MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target.result.split(',')[1];
      setImgData({
        data: b64, mimetype: file.type,
        filename: file.name, size: file.size
      });
      setImgPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const submitPost = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const body = { 
        type: postType, 
        content: postContent 
      };
      if (postType === 'image') {
        if (!imgData) { 
          alert('Select an image first'); 
          return; 
        }
        body.image = imgData;
      }
      if (postType === 'poll') {
        const opts = pollOpts.filter(o => o.trim());
        if (!pollQ.trim() || opts.length < 2) {
          alert('Need question + 2 options');
          return;
        }
        body.poll = {
          question: pollQ,
          options: opts.map(t => ({ 
            text: t, votes: [] 
          })),
          isActive: true
        };
      }
      await api.post(
        `/community/communities/${community._id}/posts`,
        body
      );
      setPostContent(''); 
      setPollQ(''); 
      setPollOpts(['','']);
      setImgData(null); 
      setImgPreview(null);
      setPostType('text');
      await fetchPosts();
    } catch (e) { 
      alert('Failed to post'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.put(
        `/community/communities/${community._id}/posts/${postId}/like`
      );
      setPosts(p => p.map(x => 
        x._id === postId ? res.data : x
      ));
    } catch (e) {}
  };

  const handleComment = async (postId, content) => {
    try {
      const res = await api.post(
        `/community/communities/${community._id}/posts/${postId}/comment`,
        { content }
      );
      setPosts(p => p.map(x => 
        x._id === postId ? res.data : x
      ));
    } catch (e) {}
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(
        `/community/communities/${community._id}/posts/${postId}`
      );
      setPosts(p => p.filter(x => x._id !== postId));
    } catch (e) {}
  };

  const handleVote = async (postId, optionIndex) => {
    try {
      const res = await api.post(
        `/community/communities/${community._id}/posts/${postId}/vote`,
        { optionIndex }
      );
      setPosts(p => p.map(x => 
        x._id === postId ? res.data : x
      ));
    } catch (e) {}
  };

  const handleEndPoll = async (postId) => {
    try {
      const res = await api.put(
        `/community/communities/${community._id}/posts/${postId}/end-poll`
      );
      setPosts(p => p.map(x => 
        x._id === postId ? res.data : x
      ));
    } catch (e) {}
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove member?')) return;
    try {
      await api.delete(
        `/community/communities/${community._id}/members/${userId}`
      );
      onBack();
    } catch (e) { 
      alert('Failed to remove'); 
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-green-800 rounded-xl 
        p-4 mb-4 text-white">
        <button onClick={onBack}
          className="text-green-200 text-sm 
            mb-2 hover:text-white block">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {community.coverImage ? (
            <img src={community.coverImage}
              alt="" className="w-14 h-14 
                rounded-full object-cover 
                border-2 border-green-400" />
          ) : (
            <div className="w-14 h-14 rounded-full 
              bg-green-600 flex items-center 
              justify-center text-2xl font-bold">
              {community.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">
              {community.name}
            </h2>
            {community.description && (
              <p className="text-green-200 text-sm">
                {community.description}
              </p>
            )}
            <button
              onClick={() => 
                setShowMembers(!showMembers)
              }
              className="text-green-300 text-xs 
                underline mt-0.5">
              {community.memberCount} members
            </button>
          </div>
        </div>
      </div>

      {showMembers && (
        <div className="bg-white rounded-xl 
          shadow-sm border p-4 mb-4">
          <h3 className="font-semibold 
            text-green-800 mb-3 text-sm">
            Members
          </h3>
          {(community.members || []).map((m, i) => (
            <div key={i} className="flex items-center 
              justify-between py-2 border-b 
              border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full 
                  bg-green-700 flex items-center 
                  justify-center text-white text-sm">
                  {m.userName?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm">
                  {m.userName}
                </span>
                {m.userId?.toString() === 
                  community.creatorId?.toString() && (
                  <span className="text-xs 
                    bg-green-100 text-green-700 
                    px-1.5 rounded">
                    Admin
                  </span>
                )}
              </div>
              {isCreator && 
                m.userId?.toString() !== 
                community.creatorId?.toString() && (
                <button
                  onClick={() => 
                    removeMember(m.userId.toString())
                  }
                  className="text-xs text-red-500 
                    hover:text-red-700">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl 
        shadow-sm border p-4 mb-4">
        <h3 className="font-semibold text-green-800 
          mb-3 text-sm">Create Post</h3>
        <div className="flex gap-2 mb-3">
          {[
            ['text','📝 Text'],
            ['image','🖼️ Image'],
            ['poll','📊 Poll']
          ].map(([t,l]) => (
            <button key={t}
              onClick={() => setPostType(t)}
              className={`px-3 py-1 rounded-full 
                text-xs transition
                ${postType === t
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
              {l}
            </button>
          ))}
        </div>

        <textarea
          value={postContent}
          onChange={e => setPostContent(e.target.value)}
          placeholder="Write something..."
          rows={3}
          className="w-full border border-gray-200 
            rounded-lg p-3 text-sm resize-none 
            focus:outline-none 
            focus:border-green-500"
        />

        {postType === 'image' && (
          <div className="mt-2">
            <input type="file" accept="image/*"
              ref={fileRef} onChange={selectImage}
              className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed 
                border-green-300 rounded-lg p-3 
                text-sm text-green-700 
                hover:bg-green-50">
              {imgPreview 
                ? '✅ Image selected — click to change'
                : '📁 Select image (max 100MB)'
              }
            </button>
            {imgPreview && (
              <img src={imgPreview} alt=""
                className="mt-2 rounded-lg 
                  max-h-40 object-cover" />
            )}
          </div>
        )}

        {postType === 'poll' && (
          <div className="mt-2 space-y-2">
            <input value={pollQ}
              onChange={e => setPollQ(e.target.value)}
              placeholder="Poll question *"
              className="w-full border border-gray-200 
                rounded-lg px-3 py-2 text-sm 
                focus:outline-none 
                focus:border-green-500" />
            {pollOpts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o}
                  onChange={e => {
                    const u = [...pollOpts];
                    u[i] = e.target.value;
                    setPollOpts(u);
                  }}
                  placeholder={`Option ${i+1}`}
                  className="flex-1 border 
                    border-gray-200 rounded-lg 
                    px-3 py-2 text-sm 
                    focus:outline-none 
                    focus:border-green-500" />
                {pollOpts.length > 2 && (
                  <button
                    onClick={() => 
                      setPollOpts(
                        pollOpts.filter(
                          (_,j) => j !== i
                        )
                      )
                    }
                    className="text-red-400 
                      hover:text-red-600 px-2">
                    ✕
                  </button>
                )}
              </div>
            ))}
            {pollOpts.length < 6 && (
              <button
                onClick={() => 
                  setPollOpts([...pollOpts,''])
                }
                className="text-xs text-green-700">
                + Add option
              </button>
            )}
          </div>
        )}

        <button
          onClick={submitPost}
          disabled={submitting}
          className="mt-3 bg-green-700 
            hover:bg-green-800 text-white 
            font-semibold py-2 px-6 rounded-lg 
            disabled:opacity-50 text-sm transition">
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 
          py-8">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-400 
          py-8">No posts yet.</div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post._id}
            post={post}
            currentUserId={currentUserId}
            communityId={community._id}
            onLike={handleLike}
            onComment={handleComment}
            onDelete={handleDelete}
            onVote={handleVote}
            onEndPoll={handleEndPoll}
          />
        ))
      )}
    </div>
  );
};

// ─── Main Community Page ──────────────────────
const Community = () => {
  const [sidebarMargin, setSidebarMargin] = useState(
    window.innerWidth >= 1024 ? 280 : 0
  );

  useEffect(() => {
    const handleResize = () => setSidebarMargin(window.innerWidth >= 1024 ? 280 : 0);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCover, setNewCover] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createNameError, setCreateNameError] = useState('');
  const coverRef = useRef();

  useEffect(() => {
    const u = JSON.parse(
      localStorage.getItem('user') || '{}'
    );
    setCurrentUser(u);
    fetchCommunities();
  }, []);

  const fetchCommunities = async (q = '') => {
    try {
      setLoading(true);
      const res = await api.get(
        `/community/communities${
          q ? `?search=${encodeURIComponent(q)}` : ''
        }`
      );
      setCommunities(res.data);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleJoin = async (id) => {
    try {
      await api.post(
        `/community/communities/${id}/join`
      );
      fetchCommunities(search);
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed');
    }
  };

  const handleLeave = async (id) => {
    if (!window.confirm('Leave community?')) return;
    try {
      await api.post(
        `/community/communities/${id}/leave`
      );
      fetchCommunities(search);
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed');
    }
  };

  const handleDeleteCommunity = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this community?\n\n' +
      'This will permanently delete the community ' +
      'and ALL posts inside it.\n\n' +
      'This action cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await api.delete(
        `/community/communities/${id}`
      );
      fetchCommunities(search);
    } catch (e) { 
      alert('Failed to delete community'); 
    }
  };

  const selectCover = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNewCover(ev.target.result);
    reader.readAsDataURL(file);
  };

  const createCommunity = async () => {
    if (!newName.trim()) {
      alert('Name required');
      return;
    }
    setCreating(true);
    try {
      await api.post('/community/communities', {
        name: newName,
        description: newDesc,
        coverImage: newCover
      });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewCover(null);
      setCreateNameError('');
      fetchCommunities(search);
    } catch (e) { 
      const msg = e.response?.data?.msg || 'Failed to create community';
      if (msg.toLowerCase().includes('name') || 
          msg.toLowerCase().includes('exist')) {
        setCreateNameError(msg);
      } else {
        alert(msg);
      }
    } finally { 
      setCreating(false); 
    }
  };

  if (!currentUser) return null;

  if (selected) {
    return (
      <div className="flex h-screen bg-[#f8fdf9] overflow-hidden">
        <Sidebar />
        <div 
          className="flex-1 h-screen overflow-y-auto p-4 lg:p-8 w-full transition-all duration-300"
          style={{ marginLeft: sidebarMargin }}
        >
            <CommunityDetail
            community={selected}
            currentUser={currentUser}
            onBack={() => {
                setSelected(null);
                fetchCommunities(search);
            }}
            />
        </div>
      </div>
    );
  }

  const currentUserId = 
    currentUser.id || currentUser._id;

  return (
    <div className="flex h-screen bg-[#f8fdf9] overflow-hidden">
      <Sidebar />
      <div 
        className="flex-1 h-screen overflow-y-auto p-4 lg:p-8 w-full transition-all duration-300"
        style={{ marginLeft: sidebarMargin }}
      >
        {/* Header - no create button here */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            color: '#1a3c2e',
            margin: '0 0 4px 0'
          }}>
            Communities
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#4a6358',
            margin: 0
          }}>
            Join communities to discuss forest conservation
          </p>
        </div>

        {/* Search bar - matches History page style */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            maxWidth: '480px'
          }}>
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Search size={16} color="#74c69d" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                fetchCommunities(e.target.value);
              }}
              placeholder="Search communities..."
              style={{
                width: '100%',
                padding: '12px 16px 12px 42px',
                border: '1.5px solid #b7e4c7',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#1b2d27',
                background: 'white',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, sans-serif'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#40916c';
                e.target.style.boxShadow = '0 0 0 3px rgba(64,145,108,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#b7e4c7';
                e.target.style.boxShadow = 'none';
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  fetchCommunities('');
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8aab9a',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p style={{
            fontSize: '13px',
            color: '#4a6358',
            margin: 0,
            whiteSpace: 'nowrap'
          }}>
            {communities.length} communit
            {communities.length !== 1 ? 'ies' : 'y'}
            {search && ` for "${search}"`}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : !loading && communities.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#4a6358'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#d8f3dc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Users size={36} color="#2d6a4f" />
            </div>
            <p style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#1a3c2e',
              margin: '0 0 8px 0',
              fontFamily: 'Outfit, sans-serif'
            }}>
              {search ? `No communities match "${search}"` : 'No communities yet'}
            </p>
            <p style={{ fontSize: '13px', margin: '0 0 20px 0' }}>
              {search ? 'Try a different search term' : 'Be the first to create a community!'}
            </p>
            {search && (
              <button
                onClick={() => { setSearch(''); fetchCommunities(''); }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {communities.map(c => (
              <div
                key={c._id}
                onClick={() => setSelected(c)}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #b7e4c7',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(45,106,79,0.06)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,106,79,0.15)';
                  e.currentTarget.style.borderColor = '#40916c';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(45,106,79,0.06)';
                  e.currentTarget.style.borderColor = '#b7e4c7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-center gap-3">
                  {c.coverImage ? (
                    <img src={c.coverImage} alt=""
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-green-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2d6a4f] to-[#1a3c2e] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm border border-[#b7e4c7]">
                      {c.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1a3c2e] truncate" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px' }}>
                      {c.name}
                    </h3>
                    <p className="text-[13px] text-[#4a6358] truncate mt-1">
                      {c.description || 'No description'}
                    </p>
                    <p className="text-[11px] font-semibold text-[#2d6a4f] bg-[#f0faf4] px-2 py-1 rounded-[6px] mt-1 inline-block uppercase tracking-[0.05em]">
                      {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: '#8aab9a',
                      margin: '6px 0 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ChevronRight size={12} />
                      Click to view posts
                    </p>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {c.isCreator ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteCommunity(c._id);
                        }}
                        className="text-sm bg-red-50 border border-red-200 text-red-600 px-4 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors">
                        Delete
                      </button>
                    ) : c.isMember ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleLeave(c._id);
                        }}
                        className="text-sm bg-gray-50 border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                        Leave
                      </button>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleJoin(c._id);
                        }}
                        className="text-sm bg-green-700 border border-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 font-medium transition-colors shadow-sm">
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold text-green-800 mb-4">
                Create Community
              </h2>
              <input type="file" accept="image/*"
                ref={coverRef} onChange={selectCover}
                className="hidden" />
              <button
                onClick={() => coverRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-green-300 rounded-xl flex items-center justify-center text-sm text-green-700 hover:bg-green-50 overflow-hidden mb-3 transition-colors">
                {newCover ? (
                  <img src={newCover} alt="" className="w-full h-full object-cover"/>
                ) : '📷 Cover image (optional)'}
              </button>
              <input
                value={newName}
                onChange={e => {
                  setNewName(e.target.value);
                  setCreateNameError('');
                }}
                placeholder="Community name *"
                style={{
                  width: '100%',
                  border: createNameError ? '1.5px solid #dc2626' : '1.5px solid #b7e4c7',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#1b2d27',
                  background: createNameError ? '#fff8f8' : '#f9fefb',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease',
                  marginBottom: createNameError ? '4px' : '12px'
                }}
              />
              {createNameError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px'
                }}>
                  <AlertCircle size={14} color="#dc2626" />
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>
                    {createNameError}
                  </p>
                </div>
              )}
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 mb-4 transition-shadow"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewName('');
                    setNewDesc('');
                    setNewCover(null);
                    setCreateNameError('');
                  }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button
                  onClick={createCommunity}
                  disabled={creating}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors shadow-md">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Create FAB - does not scroll */}
        <button
          onClick={() => setShowCreate(true)}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(45,106,79,0.4)',
            zIndex: 100,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(45,106,79,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,106,79,0.4)';
          }}
          title="Create Community"
        >
          <Plus size={24} color="white" />
        </button>
      </div>
    </div>
  );
};

export default Community;

// feat(community): render community posts list

// feat(community): add post creation modal

// feat(community): add comment thread UI under posts

// feat(community): add community selector with search

// feat(community): final UI polish and animations

// render posts list

// post creation modal

// final UI polish + animations
