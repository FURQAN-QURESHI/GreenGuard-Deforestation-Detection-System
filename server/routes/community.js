const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const { Community, CommunityPost } = require('../models/CommunityPost');
const User = require('../models/User'); // Include User model for user lookup

// Middleware to resolve accurate req.user.name for old JWTs lacking name
const resolveUserName = async (req, res, next) => {
  if (!req.user.name) {
    try {
      const userDoc = await User.findById(req.user.id).select('name');
      req.user.name = userDoc ? userDoc.name : 'Unknown';
    } catch (e) {
      req.user.name = 'Unknown';
    }
  }
  next();
};

// ─── COMMUNITIES ──────────────────────────────

// GET all communities (with search)
router.get('/communities', auth, async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = search 
      ? { name: { $regex: search, $options: 'i' } }
      : {};
    const communities = await Community
      .find(query)
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(50);
    const userId = req.user.id;
    const result = communities.map(c => ({
      ...c.toObject(),
      isMember: c.members.some(
        m => m.userId.toString() === userId
      ),
      isCreator: c.creatorId.toString() === userId
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST create community
router.post('/communities', [auth, resolveUserName], async (req, res) => {
  try {
    const { name, description, coverImage } = req.body;
    if (!name) return res.status(400).json({ 
      msg: 'Name required' 
    });

    const existing = await Community.findOne({
      name: { 
        $regex: new RegExp(`^${name.trim()}$`, 'i') 
      }
    });
    if (existing) {
      return res.status(409).json({ 
        msg: 'A community with this name already exists. Please choose a different name.' 
      });
    }

    const community = new Community({
      name: name.trim(),
      description: description || '',
      coverImage: coverImage || null,
      creatorId: req.user.id,
      creatorName: req.user.name,
      members: [{
        userId: req.user.id,
        userName: req.user.name
      }],
      memberCount: 1
    });
    await community.save();
    res.json(community);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE community (creator only)
router.delete(
  '/communities/:id', auth, async (req, res) => {
  try {
    const community = await Community.findById(
      req.params.id
    );
    if (!community) return res.status(404).json({ 
      msg: 'Not found' 
    });
    if (community.creatorId.toString() !== req.user.id)
      return res.status(403).json({ 
        msg: 'Only creator can delete' 
      });
    await Community.findByIdAndDelete(req.params.id);
    await CommunityPost.deleteMany({ 
      communityId: req.params.id 
    });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST join
router.post(
  '/communities/:id/join', [auth, resolveUserName], async (req, res) => {
  try {
    const community = await Community.findById(
      req.params.id
    );
    if (!community) return res.status(404).json({ 
      msg: 'Not found' 
    });
    const already = community.members.some(
      m => m.userId.toString() === req.user.id
    );
    if (already) return res.status(400).json({ 
      msg: 'Already a member' 
    });
    community.members.push({
      userId: req.user.id,
      userName: req.user.name
    });
    community.memberCount = community.members.length;
    await community.save();
    res.json({ msg: 'Joined' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST leave
router.post(
  '/communities/:id/leave', auth, async (req, res) => {
  try {
    const community = await Community.findById(
      req.params.id
    );
    if (!community) return res.status(404).json({ 
      msg: 'Not found' 
    });
    if (community.creatorId.toString() === req.user.id)
      return res.status(400).json({ 
        msg: 'Creator cannot leave. Delete instead.' 
      });
    community.members = community.members.filter(
      m => m.userId.toString() !== req.user.id
    );
    community.memberCount = community.members.length;
    await community.save();
    res.json({ msg: 'Left' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE remove member (creator only)
router.delete(
  '/communities/:id/members/:userId', 
  auth, async (req, res) => {
  try {
    const community = await Community.findById(
      req.params.id
    );
    if (!community) return res.status(404).json({ 
      msg: 'Not found' 
    });
    if (community.creatorId.toString() !== req.user.id)
      return res.status(403).json({ 
        msg: 'Only creator can remove members' 
      });
    community.members = community.members.filter(
      m => m.userId.toString() !== req.params.userId
    );
    community.memberCount = community.members.length;
    await community.save();
    res.json({ msg: 'Member removed' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── POSTS ────────────────────────────────────

// GET posts for community
router.get(
  '/communities/:id/posts', 
  auth, async (req, res) => {
  try {
    const posts = await CommunityPost
      .find({ communityId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST create post
router.post(
  '/communities/:id/posts', 
  [auth, resolveUserName], async (req, res) => {
  try {
    const { type, content, image, 
            poll, newsData } = req.body;
    const post = new CommunityPost({
      communityId: req.params.id,
      authorId: req.user.id,
      authorName: req.user.name,
      type: type || 'text',
      content: content || '',
      ...(image && { image }),
      ...(poll && { poll }),
      ...(newsData && { newsData })
    });
    await post.save();
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE post (author only)
router.delete(
  '/communities/:id/posts/:postId',
  auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(
      req.params.postId
    );
    if (!post) return res.status(404).json({ 
      msg: 'Not found' 
    });
    if (post.authorId.toString() !== req.user.id)
      return res.status(403).json({ 
        msg: 'Not authorized' 
      });
    await CommunityPost.findByIdAndDelete(
      req.params.postId
    );
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT like/unlike
router.put(
  '/communities/:id/posts/:postId/like',
  auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(
      req.params.postId
    );
    if (!post) return res.status(404).json({ 
      msg: 'Not found' 
    });
    const liked = post.likes.some(
      id => id.toString() === req.user.id
    );
    if (liked) {
      post.likes = post.likes.filter(
        id => id.toString() !== req.user.id
      );
    } else {
      post.likes.push(req.user.id);
    }
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST add comment
router.post(
  '/communities/:id/posts/:postId/comment',
  [auth, resolveUserName], async (req, res) => {
  try {
    const post = await CommunityPost.findById(
      req.params.postId
    );
    if (!post) return res.status(404).json({ 
      msg: 'Not found' 
    });
    post.comments.push({
      authorId: req.user.id,
      authorName: req.user.name,
      content: req.body.content
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST vote on poll
router.post(
  '/communities/:id/posts/:postId/vote',
  auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(
      req.params.postId
    );
    if (!post || post.type !== 'poll')
      return res.status(404).json({ 
        msg: 'Poll not found' 
      });
    if (!post.poll.isActive)
      return res.status(400).json({ 
        msg: 'Poll has ended' 
      });
    const userId = req.user.id;
    const { optionIndex } = req.body;
    post.poll.options = post.poll.options.map(
      (opt, i) => ({
        ...opt.toObject(),
        votes: opt.votes.filter(
          v => v.toString() !== userId
        )
      })
    );
    post.poll.options[optionIndex].votes.push(userId);
    post.markModified('poll');
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT end poll (post author only)
router.put(
  '/communities/:id/posts/:postId/end-poll',
  auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(
      req.params.postId
    );
    if (!post || post.type !== 'poll')
      return res.status(404).json({ 
        msg: 'Not found' 
      });
    if (post.authorId.toString() !== req.user.id)
      return res.status(403).json({ 
        msg: 'Only post author can end poll' 
      });
    post.poll.isActive = false;
    post.markModified('poll');
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

// feat(community): add like endpoint with likedBy tracking

// feat(community): add search with regex filter

// feat(community): introduce Community entity with member counts

// fix(community): handle missing req.user.name gracefully

// like endpoint with likedBy
