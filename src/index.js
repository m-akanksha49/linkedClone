const express = require("express");
const path = require("path");
const { User, Post } = require("./config");
const bcrypt = require("bcrypt");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Session setup
app.use(session({
  secret: "secretKey",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Routes
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.send("Passwords do not match!");
    }

    const existingUser = await User.findOne({ name: username });
    if (existingUser) {
      return res.send("User already exists!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name: username, 
      password: hashedPassword 
    });
    
    await user.save();
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ name: username });
    
    if (!user) {
      return res.send("User not found");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.send("Wrong password");
    }

    req.session.user = user.name;
    req.session.userId = user._id;
    res.redirect("/home");
  } catch (error) {
    console.error(error);
    res.send("Error logging in");
  }
});

// Home Page
app.get("/home", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render("home", { 
      name: req.session.user,
      posts: posts || [],
      currentUser: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.render("home", { 
      name: req.session.user,
      posts: [],
      currentUser: req.session.user
    });
  }
});

// Create Post
app.post("/create-post", upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  try {
    const { content } = req.body;
    
    if (!content && !req.files?.image && !req.files?.video) {
      return res.send("Post content, image, or video is required");
    }

    const image = req.files?.image ? '/uploads/' + req.files.image[0].filename : '';
    const video = req.files?.video ? '/uploads/' + req.files.video[0].filename : '';

    const newPost = new Post({
      username: req.session.user,
      content: content || "",
      image: image,
      video: video
    });
    
    await newPost.save();
    res.redirect("/home");
  } catch (error) {
    console.error(error);
    res.send("Error creating post");
  }
});

// Like/Unlike Post
app.post("/like-post/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  
  try {
    const postId = req.params.id;
    const username = req.session.user;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.send("Post not found");
    }
    
    const userIndex = post.likes.indexOf(username);
    
    if (userIndex > -1) {
      // Unlike
      post.likes.splice(userIndex, 1);
    } else {
      // Like
      post.likes.push(username);
    }
    
    post.likesCount = post.likes.length;
    await post.save();
    
    res.redirect("/home");
  } catch (error) {
    console.error(error);
    res.send("Error processing like");
  }
});

// Add Comment
app.post("/comment-post/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  
  try {
    const postId = req.params.id;
    const { comment } = req.body;
    
    if (!comment || comment.trim() === '') {
      return res.redirect("/home");
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.send("Post not found");
    }
    
    post.comments.push({
      username: req.session.user,
      content: comment.trim()
    });
    
    await post.save();
    res.redirect("/home");
  } catch (error) {
    console.error(error);
    res.send("Error adding comment");
  }
});

// User Profile Page
app.get("/profile/:username", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  
  try {
    const username = req.params.username;
    const user = await User.findOne({ name: username });
    
    if (!user) {
      return res.send("User not found");
    }
    
    const userPosts = await Post.find({ username: username }).sort({ createdAt: -1 });
    
    res.render("profile", {
      currentUser: req.session.user,
      profileUser: user,
      posts: userPosts || []
    });
  } catch (error) {
    console.error(error);
    res.send("Error loading profile");
  }
});

// Edit Profile Page
app.get("/edit-profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  
  try {
    const user = await User.findOne({ name: req.session.user });
    res.render("edit-profile", { user: user || {} });
  } catch (error) {
    console.error(error);
    res.redirect("/home");
  }
});

// Update Profile
app.post("/edit-profile", upload.single('profileImage'), async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  
  try {
    const { email, bio, education, gender, age, certifications } = req.body;
    
    const updateData = {
      email: email || "",
      bio: bio || "",
      education: education || "",
      gender: gender || "",
      age: age ? parseInt(age) : null,
      certifications: certifications ? certifications.split(',').map(c => c.trim()) : []
    };
    
    if (req.file) {
      updateData.profileImage = '/uploads/' + req.file.filename;
    }
    
    await User.findOneAndUpdate(
      { name: req.session.user },
      updateData,
      { new: true }
    );
    
    res.redirect("/profile/" + req.session.user);
  } catch (error) {
    console.error(error);
    res.send("Error updating profile");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/");
  });
});

// Start server
const port = 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});