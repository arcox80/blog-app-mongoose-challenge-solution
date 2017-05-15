const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const { DATABASE_URL } = require('../config');
const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];
  for (let i = 1; i <= 10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
  return BlogPost.insertMany(seedData);
};

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}


describe('Blog API resource', function () {

  before(function () {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function () {
    return seedBlogData();
  });

  afterEach(function () {
    return tearDownDb();
  });

  after(function () {
    return closeServer();
  });


  describe('GET endpoint', function () {
    it('should return all existing blog posts', function () {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function (_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function (count) {
          res.body.should.have.length.of(count);
        });
    });

    it('should return posts with the correct fields', function () {
      let resBlogPost;
      return chai.request(app)
        .get('/posts')
        .then(function (res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);

          res.body.forEach(function (post) {
            post.should.be.a('object');
            post.should.include.keys('id', 'author', 'content', 'title', 'created');
          });
          resBlogPost = res.body[0];
          return BlogPost.findById(resBlogPost.id).exec();
        })
        .then(function (post) {
          resBlogPost.author.should.equal(post.authorName);
          resBlogPost.content.should.equal(post.content);
          resBlogPost.title.should.equal(post.title);
        });
    });
  });

  describe('POST endpoint', function () {
    it('should add a new post', function () {
      const newPost = {
        authorName: 'Andrew Cox',
        content: 'Here is some text for a new post.',
        title: 'Title for a Fake Test Post'
      };

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function (res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys('id', 'author', 'content', 'title', 'created');
          res.body.id.should.not.be.null;
          res.body.author.should.equal(newPost.authorName);
          res.body.content.should.equal(newPost.content);
          res.body.title.should.equal(newPost.title);
          return BlogPost.findById(res.body.id).exec();
        })
        .then(function (post) {
          post.authorName.should.equal(newPost.authorName);
          post.content.should.equal(newPost.content);
          post.title.should.equal(newPost.title);
        });
    });
  });

  describe('PUT endpoint', function () {
    it('should update fields you send over', function () {
      const updateData = {
        title: 'The New Updated Title',
        content: 'Here is the updated content for this post.'
      };

      return BlogPost
        .findOne()
        .exec()
        .then(function (post) {
          updateData.id = post.id;
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function (res) {
          res.should.have.status(201);
          return BlogPost.findById(updateData.id).exec();
        })
        .then(function (post) {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function () {
    it('delete a post by its id', function () {
      let post;
      return BlogPost
        .findOne()
        .exec()
        .then(function (_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function (res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id).exec();
        })
        .then(function (_post) {
          should.not.exist(_post);
        });
    });
  });
});