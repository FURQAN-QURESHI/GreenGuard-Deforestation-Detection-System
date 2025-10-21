const mongoose = require('mongoose');

// ─── Schema 1: Community (the group) ─────────
const CommunitySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    default: '',
    maxlength: 500
  },
  coverImage: {
    type: String,
    default: null
  },
  creatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  creatorName: { 
    type: String, 
    required: true 
  },
  members: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    userName: String,
    joinedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  memberCount: { 
    type: Number, 
    default: 1 
  }
}, { timestamps: true });

// ─── Schema 2: Post inside community ─────────
const PostSchema = new mongoose.Schema({
  communityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Community', 
    required: true 
  },
  authorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  authorName: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['text', 'image', 'poll', 'news_share'],
    default: 'text'
  },
  content: { 
    type: String, 
    default: '' 
  },
  image: {
    data: String,
    mimetype: String,
    filename: String,
    size: Number
  },
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      }]
    }],
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  newsData: {
    title: String,
    description: String,
    url: String,
    source: String,
    publishedAt: String
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  comments: [{
    authorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    authorName: String,
    content: String,
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { timestamps: true });

const Community = mongoose.model(
  'Community', CommunitySchema
);
const CommunityPost = mongoose.model(
  'CommunityPost', PostSchema
);

module.exports = { Community, CommunityPost };

// feat(community): extend schema with Community reference

// extend schema with Community ref
