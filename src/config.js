const mongoose = require('mongoose');

const connect = mongoose.connect("mongodb+srv://hema:Akanksha%40l49@cluster0.jdi94i5.mongodb.net/Login-tut");

connect.then(() => {
  console.log("Database Connected Successfully");
}).catch((error) => {
  console.log("Database cannot be Connected", error);
});

// User Schema
const Loginschema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  education: {
    type: String,
    default: ""
  },
  gender: {
    type: String,
    default: ""
  },
  age: {
    type: Number,
    default: null
  },
  certifications: {
    type: [String],
    default: []
  },
  profileImage: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Post Schema
const PostSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ""
  },
  video: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  likes: {
    type: [String],
    default: []
  },
  likesCount: {
    type: Number,
    default: 0
  },
  comments: [{
    username: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const User = mongoose.model("users", Loginschema);
const Post = mongoose.model("posts", PostSchema);

module.exports = { User, Post };